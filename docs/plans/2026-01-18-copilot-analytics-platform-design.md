# Copilot Analytics & Coaching Platform - Design Document

**Date**: January 18, 2026
**Status**: Approved
**Target**: 500-member engineering organization

## Executive Summary

A comprehensive analytics and coaching platform for tracking GitHub Copilot and Cursor usage across the organization. The system collects telemetry via VS Code extensions, analyzes prompt quality using rule-based + LLM hybrid approach, and delivers personalized coaching through multi-channel feedback (dashboard, email, in-IDE notifications).

**Key Goals**:
- Track individual developer AI assistant usage patterns
- Identify common prompting issues and inefficiencies
- Provide personalized coaching suggestions
- Enable org-wide cohort-based training interventions
- Measure ROI and cost optimization opportunities

---

## 1. System Architecture

### Components

**1. VS Code Extensions** (2 separate plugins)
- **copilot-analytics-plugin**: Hooks into GitHub Copilot via VS Code extension API
- **cursor-analytics-plugin**: Uses Cursor's native hooks API
- Both collect telemetry and send encrypted payloads to backend
- Authentication via VS Code authentication API → Supabase Auth

**2. Supabase Backend**
- PostgreSQL database with row-level security (RLS)
- Real-time subscriptions for dashboard updates
- Edge functions for webhook endpoints
- Storage for encrypted backups

**3. Analysis Engine** (Dockerized services)
- Batch processor (hourly/daily aggregation)
- Rule-based analyzer (basic scoring without LLM)
- LLM analyzer (weekly deep analysis with multi-provider support)
- Email service (weekly digests)

**4. Web Dashboard** (Dockerized Next.js app)
- Role-based views: Developer, Manager, Admin
- Individual scorecards, team analytics, cohort identification, cost tracking

### Technology Stack
- **Frontend**: Next.js, React, TailwindCSS, Recharts/Tremor
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Analysis**: Python/Node.js batch processors
- **LLM Providers**: Claude, GPT-4, Gemini, Minimax (configurable)
- **Deployment**: Docker containers in org infrastructure

---

## 2. Data Collection & Plugin Implementation

### GitHub Copilot Plugin

Monitors via VS Code extension API:
- **Inline completions**: `vscode.InlineCompletionItemProvider` for suggestions shown/accepted/rejected
- **Chat events**: Monitor Copilot Chat panel interactions
- **Document edits**: Track modifications after suggestions
- **Context snapshots**: Open files, cursor position, selected code

### Cursor Plugin

Leverages Cursor's hooks API:
- `beforeMCPExecution`: Capture prompt, context size, model selected
- `afterMCPExecution`: Capture response, tokens used, latency
- `afterFileEdit`: Track acceptance/rejection, manual edits
- `onError`: Capture failures, retries, error types

### Unified Data Payload

```json
{
  "user_id": "uuid",
  "session_id": "uuid",
  "timestamp": "ISO8601",
  "event_type": "prompt|completion|accept|reject|edit",
  "platform": "copilot|cursor",
  "model": "gpt-4|claude-3.5|etc",
  "prompt_data": "encrypted_blob",
  "response_data": "encrypted_blob",
  "metadata": {
    "context_files": 3,
    "context_size_tokens": 1200,
    "response_tokens": 450,
    "latency_ms": 2300,
    "file_type": ".ts",
    "retry_count": 0
  }
}
```

Client-side encryption before transmission to Supabase.

---

## 3. Database Schema

### Core Tables

**`users`**
```sql
id (uuid, primary key)
email, name, department, role (developer|manager|admin)
created_at, last_active
```

**`events`** (raw telemetry)
```sql
id (uuid), user_id (foreign key)
session_id, timestamp, event_type, platform, model
prompt_encrypted (text), response_encrypted (text)
metadata (jsonb)
```

**`daily_metrics`** (aggregated)
```sql
user_id, date, platform
total_prompts, accepted_count, rejected_count, retry_count
total_tokens_used, avg_response_time_ms
context_avg_files, context_avg_tokens
file_types_worked (jsonb)
```

**`quality_scores`** (weekly LLM analysis)
```sql
user_id, week_start_date
effectiveness_score (0-100), best_practices_score, efficiency_score
overall_score (weighted average)
insights (jsonb), suggestions (jsonb)
```

**`cohorts`** (identified patterns)
```sql
id, name, criteria (jsonb), member_count
coaching_plan (text), created_at
```

### Row-Level Security
- Developers: See only their own data
- Managers: See aggregated team data (no individual prompts)
- Admins: See everything

---

## 4. Analysis Engine & Scoring System

### Batch Processor (hourly/daily)

Aggregates `events` into `daily_metrics`:
- Count prompts, accepts, rejects, retries per user/day
- Calculate token usage, average latencies
- Identify file types and context patterns

### Rule-Based Analyzer (daily)

Calculates scores without LLM:
- **Prompt specificity**: Length, question marks, keyword density
- **Context usage**: Files included vs task complexity heuristic
- **Retry patterns**: High retry rate = unclear prompts
- **Model selection**: Expensive model for simple task?

### LLM Analyzer (weekly)

Batch analyzes last 7 days per user:
- Decrypt and send anonymized prompt samples to configured LLM
- Analysis prompt: "Analyze these AI coding assistant interactions. Identify: prompt clarity issues, missing context, vague requests, improper model usage, inefficient patterns. Provide 3-5 specific coaching suggestions."
- Store structured insights in `quality_scores` table

### Composite Score Calculation

```
overall_score = (
  effectiveness_score * 0.4 +      // Accept rate, edit distance, retry rate
  best_practices_score * 0.35 +    // Specificity, context usage, decomposition
  efficiency_score * 0.25          // Token cost, model selection, session length
)
```

Weights configurable per organization.

---

## 5. Multi-Provider LLM Integration

### Unified Adapter Pattern

```typescript
interface LLMProvider {
  analyze(prompts: DecryptedPrompt[]): Promise<AnalysisResult>
  estimateCost(tokenCount: number): number
  supportsStreaming: boolean
}
```

### Supported Providers
- **Anthropic Claude** (claude-3-5-sonnet)
- **OpenAI GPT-4**
- **Google Gemini 2.0**
- **Minimax 2.1**

### Configuration
```json
{
  "llm_provider": "anthropic",
  "model": "claude-3-5-sonnet-20250129",
  "api_key_env": "ANTHROPIC_API_KEY",
  "fallback_provider": "openai",
  "max_tokens": 2000,
  "temperature": 0.3
}
```

### Context7 MCP Integration
- Fetch latest API documentation for each provider
- Auto-update prompt templates when APIs change
- Keep adapters current with new model releases

### Cost Optimization
- Batch analysis (50-100 prompts per LLM call)
- Cache common insights across similar patterns
- Cheaper models for screening, premium for deep analysis

---

## 6. Dashboard & Visualization

### Developer View (Individual Scorecard)
- Personal metrics: Weekly prompts, acceptance rate, avg tokens, model usage
- Score breakdown: Overall + 3 sub-scores with 8-week trend graphs
- Recent insights: Top 3 issues identified by LLM
- Actionable suggestions: Personalized tips with before/after examples
- Comparison: Anonymous percentile rank vs org average

### Manager View (Team Analytics)
- Team dashboard: Aggregate metrics for department/team
- Performance distribution: Histogram of team member scores
- Trend analysis: Team improvement over time
- Top performers & struggling members
- Common issues across team

### Admin View (Org-wide Insights)
- Cost tracking: Total tokens used, cost per model, ROI metrics
- Model distribution: Usage patterns, appropriateness
- Cohort explorer: View cohorts, track membership changes
- Training impact: A/B analysis of coaching interventions
- Export reports: CSV/PDF for exec presentations

### Tech Stack
Next.js + React + TailwindCSS + Recharts/Tremor, deployed in Docker

---

## 7. Multi-Channel Feedback System

### In-IDE Notifications (selective)
- **Critical alerts**: Harmful patterns detected (e.g., 5+ retries on same prompt)
- **Weekly score pop-up**: Updated overall score with dashboard link
- **Status bar indicator**: Live acceptance rate for current session
- Configurable: developers can disable

### Weekly Email Digest
- **Sent**: Every Monday morning
- **Content**: Overall score, change from previous week, top 2 wins, top 2 improvement areas, 3 actionable tips
- **Personalized examples**: "Instead of 'refactor this code', try 'extract validateUser logic into separate function with error handling'"
- **Link to dashboard**: Deep-link to full scorecard

### Dashboard Deep-Dive
- Full historical data, all metrics, complete insights
- Interactive exploration: filter by date, model, file type, project
- Downloadable reports for 1-on-1s
- Coaching resources: linked articles/videos

### Escalation Path
1. Rule-based analyzer detects issue → Dashboard updated
2. Issue persists 2+ weeks → Included in email digest
3. Critical pattern → In-IDE alert + manager notification

---

## 8. Cohort Identification & Coaching Strategy

### Automated Cohort Detection (weekly)

**Common Cohorts**:
- **"Over-prompters"**: >50 prompts/day, low acceptance (<40%) → Prompt specificity training
- **"Context-light users"**: Avg <2 context files → Teach file inclusion
- **"Retry loopers"**: High retry count (>3 per task) → Task breakdown workshop
- **"Expensive model users"**: GPT-4/Claude for simple tasks → Model selection guidance
- **"Copy-paste acceptors"**: High acceptance (>90%) + immediate edits → Review-before-accept training
- **"Quick learners"**: Score improved >20 points in 4 weeks → Peer mentoring candidates

### Cohort Schema
```json
{
  "cohort_id": "uuid",
  "name": "Over-prompters",
  "criteria": {
    "daily_prompt_count": ">50",
    "acceptance_rate": "<40"
  },
  "member_count": 23,
  "coaching_plan": "2-hour workshop: Writing Effective AI Prompts"
}
```

### Coaching Interventions
1. **Automated suggestions**: LLM-generated personalized tips in email
2. **Cohort workshops**: Targeted training for cohort members
3. **Best practice library**: Dashboard links to wiki with anonymized examples
4. **Peer mentoring**: Connect low-scorers with high-scorers
5. **Manager 1-on-1s**: Flag struggling developers

### Success Metrics
- Score improvement 4 weeks post-intervention
- Cohort membership changes
- Acceptance rate trends
- Cost reduction per developer

---

## 9. Deployment & Infrastructure

### Docker Composition (self-hosted)

**1. Dashboard Container** (`dashboard-app`)
- Next.js app, Node 20, port 3000
- Connects to Supabase via public URL + anon key
- Nginx reverse proxy for SSL

**2. Batch Processor Container** (`analytics-engine`)
- Python/Node.js service with cron jobs
- Jobs: Hourly metrics aggregation, daily rule-based scoring, weekly LLM analysis
- Direct Supabase connection with service role key
- LLM provider SDKs installed

**3. Email Service Container** (`notification-service`)
- Sends weekly digests via SMTP/SendGrid/Mailgun
- Fetches user scores, renders email templates
- Retry logic for failed deliveries

### Supabase
- Option A: Supabase Cloud (managed)
- Option B: Self-hosted Supabase with Docker Compose (full control)

### VS Code Extension Distribution
- Private extension marketplace or `.vsix` file distribution
- Auto-update via VS Code extension API
- Installation guide for developers

### Deployment Flow
```
Developer workstation → VS Code extension installed
                      ↓
                  Supabase (database + edge functions)
                      ↓
              Docker host (3 containers)
                      ↓
              Dashboard accessed via internal URL
```

---

## 10. Security & Privacy (Deferred)

Security hardening (encryption, access control, audit logging, secrets management) will be implemented in a later phase. Initial deployment focuses on core functionality with basic authentication via VS Code auth + Supabase.

---

## Implementation Phases

### Phase 1: MVP (4-6 weeks)
- Cursor plugin with basic telemetry
- Supabase schema + batch processor
- Simple developer dashboard
- Rule-based scoring only (no LLM)

### Phase 2: Analytics (4-6 weeks)
- GitHub Copilot plugin
- LLM analyzer with multi-provider support
- Weekly email digests
- Manager and admin dashboards

### Phase 3: Coaching (3-4 weeks)
- Cohort identification
- In-IDE notifications
- Best practice library
- Peer mentoring matching

### Phase 4: Security & Scale (ongoing)
- Client-side encryption
- Comprehensive RLS policies
- Audit logging
- Performance optimization for >500 users

---

## Success Criteria

**Adoption**: >80% of developers install and use the plugin
**Engagement**: >60% of developers view dashboard monthly
**Improvement**: Average org score improves 15+ points in 6 months
**Cost reduction**: 20% decrease in unnecessary premium model usage
**Training efficiency**: Cohort-based workshops reduce training time by 30%

---

## References

- [GitHub Copilot Chat extension repository](https://github.com/microsoft/vscode-copilot-chat)
- [Building GitHub Copilot Extensions](https://docs.github.com/en/copilot/building-copilot-extensions/about-building-copilot-extensions)
- [Cursor Hooks documentation](https://cursor.com/docs/agent/hooks)
- [Cursor Hooks partners blog](https://cursor.com/blog/hooks-partners)
- [Supabase Documentation](https://supabase.com/docs)
- [VS Code Extension API](https://code.visualstudio.com/api)
