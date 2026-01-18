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
