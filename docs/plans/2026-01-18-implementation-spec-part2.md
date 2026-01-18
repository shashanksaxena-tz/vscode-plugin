# Implementation Specification - Part 2

## 4. Supabase Backend

### Database Schema (SQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    department TEXT,
    role TEXT DEFAULT 'developer' CHECK (role IN ('developer', 'manager', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (raw telemetry)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('copilot', 'cursor', 'copilot-intellij')),
    model TEXT,
    prompt_encrypted TEXT,
    response_encrypted TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for queries
CREATE INDEX idx_events_user_timestamp ON events(user_id, timestamp DESC);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_event_type ON events(event_type);

-- Daily metrics (aggregated)
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    platform TEXT NOT NULL,
    total_prompts INT DEFAULT 0,
    accepted_count INT DEFAULT 0,
    rejected_count INT DEFAULT 0,
    retry_count INT DEFAULT 0,
    total_tokens_used INT DEFAULT 0,
    avg_response_time_ms INT DEFAULT 0,
    context_avg_files FLOAT DEFAULT 0,
    context_avg_tokens FLOAT DEFAULT 0,
    file_types_worked JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date, platform)
);

CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date DESC);

-- Quality scores (weekly LLM analysis)
CREATE TABLE quality_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    week_start_date DATE NOT NULL,
    effectiveness_score INT DEFAULT 0 CHECK (effectiveness_score BETWEEN 0 AND 100),
    best_practices_score INT DEFAULT 0 CHECK (best_practices_score BETWEEN 0 AND 100),
    efficiency_score INT DEFAULT 0 CHECK (efficiency_score BETWEEN 0 AND 100),
    overall_score INT DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
    insights JSONB DEFAULT '[]',
    suggestions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

CREATE INDEX idx_quality_scores_user_week ON quality_scores(user_id, week_start_date DESC);

-- Cohorts (identified patterns)
CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL,
    member_count INT DEFAULT 0,
    coaching_plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cohort members (junction table)
CREATE TABLE cohort_members (
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (cohort_id, user_id)
);

-- Row Level Security Policies

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;

-- Developers see only their own data
CREATE POLICY dev_own_events ON events
    FOR SELECT USING (
        auth.jwt()->>'email' = user_id OR
        auth.jwt()->>'role' = 'admin'
    );

CREATE POLICY dev_insert_events ON events
    FOR INSERT WITH CHECK (true);

CREATE POLICY dev_own_metrics ON daily_metrics
    FOR SELECT USING (
        auth.jwt()->>'email' = user_id OR
        auth.jwt()->>'role' IN ('manager', 'admin')
    );

CREATE POLICY dev_own_scores ON quality_scores
    FOR SELECT USING (
        auth.jwt()->>'email' = user_id OR
        auth.jwt()->>'role' IN ('manager', 'admin')
    );

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(target_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO daily_metrics (user_id, date, platform, total_prompts, accepted_count, rejected_count, retry_count, avg_response_time_ms)
    SELECT
        user_id,
        target_date,
        platform,
        COUNT(*) FILTER (WHERE event_type IN ('prompt_submitted', 'completion_requested')) as total_prompts,
        COUNT(*) FILTER (WHERE event_type = 'completion_accepted') as accepted_count,
        COUNT(*) FILTER (WHERE event_type = 'completion_rejected') as rejected_count,
        COALESCE(SUM((metadata->>'retry_count')::int), 0) as retry_count,
        COALESCE(AVG((metadata->>'latency_ms')::int), 0)::int as avg_response_time_ms
    FROM events
    WHERE DATE(timestamp) = target_date
    GROUP BY user_id, platform
    ON CONFLICT (user_id, date, platform) DO UPDATE SET
        total_prompts = EXCLUDED.total_prompts,
        accepted_count = EXCLUDED.accepted_count,
        rejected_count = EXCLUDED.rejected_count,
        retry_count = EXCLUDED.retry_count,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms;
END;
$$ LANGUAGE plpgsql;
```

### Supabase Edge Function: Ingest Events

Create file `supabase/functions/ingest-events/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelemetryEvent {
  user_id: string;
  session_id: string;
  timestamp: string;
  event_type: string;
  platform: string;
  model?: string;
  prompt_encrypted?: string;
  response_encrypted?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const events: TelemetryEvent[] = await req.json();

    // Validate events
    const validEvents = events.filter(
      (e) => e.user_id && e.session_id && e.timestamp && e.event_type && e.platform
    );

    if (validEvents.length === 0) {
      return new Response(JSON.stringify({ error: "No valid events" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert events
    const { error } = await supabase.from("events").insert(validEvents);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, count: validEvents.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### TypeScript Types (Generated from Schema)

Create file `src/types/database.ts`:

```typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          department: string | null;
          role: "developer" | "manager" | "admin";
          created_at: string;
          last_active: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          department?: string | null;
          role?: "developer" | "manager" | "admin";
          created_at?: string;
          last_active?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          department?: string | null;
          role?: "developer" | "manager" | "admin";
          created_at?: string;
          last_active?: string;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          timestamp: string;
          event_type: string;
          platform: "copilot" | "cursor" | "copilot-intellij";
          model: string | null;
          prompt_encrypted: string | null;
          response_encrypted: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          timestamp: string;
          event_type: string;
          platform: "copilot" | "cursor" | "copilot-intellij";
          model?: string | null;
          prompt_encrypted?: string | null;
          response_encrypted?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      daily_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          platform: string;
          total_prompts: number;
          accepted_count: number;
          rejected_count: number;
          retry_count: number;
          total_tokens_used: number;
          avg_response_time_ms: number;
          context_avg_files: number;
          context_avg_tokens: number;
          file_types_worked: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_metrics"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["daily_metrics"]["Insert"]>;
      };
      quality_scores: {
        Row: {
          id: string;
          user_id: string;
          week_start_date: string;
          effectiveness_score: number;
          best_practices_score: number;
          efficiency_score: number;
          overall_score: number;
          insights: Json;
          suggestions: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quality_scores"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["quality_scores"]["Insert"]>;
      };
      cohorts: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          criteria: Json;
          member_count: number;
          coaching_plan: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cohorts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["cohorts"]["Insert"]>;
      };
    };
  };
}
```

---

## 5. Next.js Dashboard

### Project Structure
```
analytics-dashboard/
├── package.json
├── next.config.js
├── tailwind.config.ts
├── .env.local
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Developer view
│   │   │   ├── team/page.tsx         # Manager view
│   │   │   └── admin/page.tsx        # Admin view
│   │   └── api/
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── ScoreCard.tsx
│   │   ├── MetricsChart.tsx
│   │   ├── SuggestionsList.tsx
│   │   └── TeamTable.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   └── utils.ts
│   └── types/
│       └── database.ts
├── middleware.ts
└── Dockerfile
```

### package.json
```json
{
  "name": "analytics-dashboard",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "15.1.0",
    "@supabase/supabase-js": "^2.79.0",
    "@supabase/ssr": "^0.5.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^2.14.0",
    "@tremor/react": "^3.18.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### src/lib/supabase/server.ts
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  );
}
```

### src/lib/supabase/client.ts
```typescript
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### middleware.ts
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated and accessing dashboard
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

### src/app/layout.tsx
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Copilot Analytics Dashboard",
  description: "Track and improve your AI coding assistant usage",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### src/app/dashboard/page.tsx (Developer View)
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScoreCard } from "@/components/ScoreCard";
import { MetricsChart } from "@/components/MetricsChart";
import { SuggestionsList } from "@/components/SuggestionsList";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch latest quality score
  const { data: latestScore } = await supabase
    .from("quality_scores")
    .select("*")
    .eq("user_id", user.email)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single();

  // Fetch score history (8 weeks)
  const { data: scoreHistory } = await supabase
    .from("quality_scores")
    .select("week_start_date, overall_score, effectiveness_score, best_practices_score, efficiency_score")
    .eq("user_id", user.email)
    .order("week_start_date", { ascending: false })
    .limit(8);

  // Fetch daily metrics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: dailyMetrics } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("user_id", user.email)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: true });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Copilot Analytics</h1>
        <p className="text-gray-600">Welcome back, {user.email}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ScoreCard
          title="Overall Score"
          score={latestScore?.overall_score ?? 0}
          maxScore={100}
          color="blue"
        />
        <ScoreCard
          title="Effectiveness"
          score={latestScore?.effectiveness_score ?? 0}
          maxScore={100}
          color="green"
        />
        <ScoreCard
          title="Best Practices"
          score={latestScore?.best_practices_score ?? 0}
          maxScore={100}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Score Trend</h2>
          <MetricsChart
            data={scoreHistory?.reverse() ?? []}
            dataKey="overall_score"
            xAxisKey="week_start_date"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Activity</h2>
          <MetricsChart
            data={dailyMetrics ?? []}
            dataKey="total_prompts"
            xAxisKey="date"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Improvement Suggestions</h2>
        <SuggestionsList suggestions={latestScore?.suggestions as string[] ?? []} />
      </div>
    </div>
  );
}
```

### src/components/ScoreCard.tsx
```typescript
interface ScoreCardProps {
  title: string;
  score: number;
  maxScore: number;
  color: "blue" | "green" | "purple" | "red";
}

const colorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
};

export function ScoreCard({ title, score, maxScore, color }: ScoreCardProps) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase">{title}</h3>
      <div className="mt-2 flex items-baseline">
        <span className="text-4xl font-bold text-gray-900">{score}</span>
        <span className="ml-2 text-gray-500">/ {maxScore}</span>
      </div>
      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### src/components/MetricsChart.tsx
```typescript
"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface MetricsChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xAxisKey: string;
}

export function MetricsChart({ data, dataKey, xAxisKey }: MetricsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis
          dataKey={xAxisKey}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### src/components/SuggestionsList.tsx
```typescript
interface SuggestionsListProps {
  suggestions: string[];
}

export function SuggestionsList({ suggestions }: SuggestionsListProps) {
  if (suggestions.length === 0) {
    return (
      <p className="text-gray-500">No suggestions yet. Keep using Copilot to generate insights!</p>
    );
  }

  return (
    <ul className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <li
          key={index}
          className="flex items-start p-4 bg-blue-50 rounded-lg"
        >
          <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
            {index + 1}
          </span>
          <p className="text-gray-700">{suggestion}</p>
        </li>
      ))}
    </ul>
  );
}
```

### Dockerfile
```dockerfile
FROM node:22-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## 6. Batch Processor

### Project Structure
```
batch-processor/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── jobs/
│   │   ├── aggregateMetrics.ts
│   │   ├── ruleBasedScoring.ts
│   │   ├── llmAnalysis.ts
│   │   └── cohortDetection.ts
│   ├── providers/
│   │   ├── llm.ts
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   └── gemini.ts
│   └── utils/
│       └── supabase.ts
├── Dockerfile
└── cron-schedule.yaml
```

### src/index.ts
```typescript
import cron from "node-cron";
import { aggregateMetrics } from "./jobs/aggregateMetrics";
import { ruleBasedScoring } from "./jobs/ruleBasedScoring";
import { llmAnalysis } from "./jobs/llmAnalysis";
import { cohortDetection } from "./jobs/cohortDetection";

console.log("Batch processor started");

// Hourly: Aggregate metrics
cron.schedule("0 * * * *", async () => {
  console.log("Running hourly metrics aggregation...");
  await aggregateMetrics();
});

// Daily at 2 AM: Rule-based scoring
cron.schedule("0 2 * * *", async () => {
  console.log("Running daily rule-based scoring...");
  await ruleBasedScoring();
});

// Weekly on Monday at 3 AM: LLM analysis
cron.schedule("0 3 * * 1", async () => {
  console.log("Running weekly LLM analysis...");
  await llmAnalysis();
});

// Weekly on Monday at 5 AM: Cohort detection
cron.schedule("0 5 * * 1", async () => {
  console.log("Running weekly cohort detection...");
  await cohortDetection();
});

// Keep process running
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  process.exit(0);
});
```

### src/jobs/llmAnalysis.ts
```typescript
import { createClient } from "../utils/supabase";
import { getLLMProvider } from "../providers/llm";
import { subDays, startOfWeek } from "date-fns";

const BATCH_SIZE = 50;

export async function llmAnalysis() {
  const supabase = createClient();
  const llm = getLLMProvider();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekAgo = subDays(new Date(), 7);

  // Get all users with events in the past week
  const { data: users } = await supabase
    .from("events")
    .select("user_id")
    .gte("timestamp", weekAgo.toISOString())
    .order("user_id");

  const uniqueUsers = [...new Set(users?.map((u) => u.user_id))];

  for (const userId of uniqueUsers) {
    try {
      // Fetch user's events from past week
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", userId)
        .gte("timestamp", weekAgo.toISOString())
        .limit(BATCH_SIZE);

      if (!events || events.length === 0) continue;

      // Prepare anonymized prompt data for LLM
      const promptSamples = events
        .filter((e) => e.prompt_encrypted)
        .slice(0, 20)
        .map((e) => ({
          event_type: e.event_type,
          metadata: e.metadata,
          // Note: In production, decrypt here
        }));

      // Fetch daily metrics for rule-based scores
      const { data: metrics } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", userId)
        .gte("date", weekAgo.toISOString().split("T")[0]);

      // Calculate rule-based scores
      const effectivenessScore = calculateEffectivenessScore(metrics ?? []);
      const efficiencyScore = calculateEfficiencyScore(metrics ?? []);

      // Get LLM analysis for best practices
      const analysis = await llm.analyze(promptSamples);

      const bestPracticesScore = analysis.score;
      const overallScore = Math.round(
        effectivenessScore * 0.4 + bestPracticesScore * 0.35 + efficiencyScore * 0.25
      );

      // Save quality scores
      await supabase.from("quality_scores").upsert({
        user_id: userId,
        week_start_date: weekStart.toISOString().split("T")[0],
        effectiveness_score: effectivenessScore,
        best_practices_score: bestPracticesScore,
        efficiency_score: efficiencyScore,
        overall_score: overallScore,
        insights: analysis.insights,
        suggestions: analysis.suggestions,
      });

      console.log(`Analyzed user ${userId}: score ${overallScore}`);
    } catch (error) {
      console.error(`Failed to analyze user ${userId}:`, error);
    }
  }
}

function calculateEffectivenessScore(metrics: any[]): number {
  if (metrics.length === 0) return 50;

  const totalPrompts = metrics.reduce((sum, m) => sum + m.total_prompts, 0);
  const totalAccepted = metrics.reduce((sum, m) => sum + m.accepted_count, 0);
  const totalRetries = metrics.reduce((sum, m) => sum + m.retry_count, 0);

  if (totalPrompts === 0) return 50;

  const acceptanceRate = totalAccepted / totalPrompts;
  const retryRate = totalRetries / totalPrompts;

  // Score: high acceptance = good, high retry = bad
  return Math.round(Math.min(100, Math.max(0, acceptanceRate * 80 + (1 - retryRate) * 20)));
}

function calculateEfficiencyScore(metrics: any[]): number {
  if (metrics.length === 0) return 50;

  const avgLatency = metrics.reduce((sum, m) => sum + m.avg_response_time_ms, 0) / metrics.length;
  const avgTokens = metrics.reduce((sum, m) => sum + m.total_tokens_used, 0) / metrics.length;

  // Lower latency and reasonable token usage = better score
  const latencyScore = Math.max(0, 100 - avgLatency / 100);
  const tokenScore = avgTokens < 10000 ? 100 : Math.max(0, 100 - (avgTokens - 10000) / 1000);

  return Math.round((latencyScore + tokenScore) / 2);
}
```

### src/providers/llm.ts
```typescript
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";

export interface LLMAnalysisResult {
  score: number;
  insights: string[];
  suggestions: string[];
}

export interface LLMProvider {
  analyze(prompts: any[]): Promise<LLMAnalysisResult>;
}

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "anthropic";

  switch (provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      return new AnthropicProvider();
  }
}
```

### src/providers/anthropic.ts
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LLMAnalysisResult } from "./llm";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async analyze(prompts: any[]): Promise<LLMAnalysisResult> {
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are an expert coding assistant coach. Analyze these developer interactions with AI coding assistants.

For the interactions below, evaluate:
1. Prompt clarity (0-100): Are prompts specific and well-formed?
2. Context usage (0-100): Do they include relevant file context?
3. Task decomposition (0-100): Are complex tasks broken down?

Then provide:
- An overall best practices score (0-100)
- 3-5 specific insights about patterns you notice
- 3-5 actionable coaching suggestions with before/after examples

Interactions to analyze:
${JSON.stringify(prompts, null, 2)}

Respond in JSON format:
{
  "score": <number>,
  "insights": ["<insight1>", "<insight2>", ...],
  "suggestions": ["<suggestion1>", "<suggestion2>", ...]
}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse LLM response:", e);
    }

    return { score: 50, insights: [], suggestions: [] };
  }
}
```

---

## Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: "3.9"

services:
  dashboard:
    build:
      context: ./analytics-dashboard
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    depends_on:
      - batch-processor
    restart: unless-stopped

  batch-processor:
    build:
      context: ./batch-processor
      dockerfile: Dockerfile
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - LLM_PROVIDER=${LLM_PROVIDER}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    restart: unless-stopped

  email-service:
    build:
      context: ./email-service
      dockerfile: Dockerfile
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    restart: unless-stopped
```

---

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [InlineCompletionItemProvider Sample](https://github.com/microsoft/vscode-extension-samples/tree/main/inline-completions)
- [Cursor Hooks Documentation](https://cursor.com/docs/agent/hooks)
- [JetBrains IntelliJ Plugin SDK](https://plugins.jetbrains.com/docs/intellij/)
- [CompletionContributor Tutorial](https://plugins.jetbrains.com/docs/intellij/completion-contributor.html)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Anthropic Claude API](https://docs.anthropic.com/en/api/getting-started)