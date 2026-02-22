# Contributing to Copilot Analytics Platform

Welcome! This document provides guidelines for contributing to the Copilot Analytics Platform.

## Repository Structure

- `analytics-dashboard/`: Next.js web application for analytics visualization.
- `batch-processor/`: Node.js service for data aggregation, scoring, and LLM analysis.
- `copilot-analytics-vscode/`: VS Code extension for data collection.
- `copilot-analytics-intellij/`: JetBrains/IntelliJ plugin for data collection.
- `cursor-analytics-hooks/`: Hooks for Cursor IDE integration.
- `supabase/`: Database migrations and Edge Functions.
- `docs/`: Design documents and specifications.

## Development Environment

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Java 17+ (for IntelliJ plugin)
- Supabase CLI (optional, for local DB)

### Environment Variables
Refer to `.env.example` in `analytics-dashboard` and `batch-processor`.
Common required variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` (32-byte hex string)
- `LLM_PROVIDER` credentials (e.g., `ANTHROPIC_API_KEY`)

## Component Guides

### 1. Analytics Dashboard
**Location**: `analytics-dashboard/`
- **Stack**: Next.js 14 (App Router), Tailwind CSS.
- **Build**: `npm run build`
- **Test**: `npm test`
- **Dev**: `npm run dev` (Requires `.env.local`)
- **Admin**: Audit logs available at `/dashboard/admin` (requires `admin` role in `users` table).

### 2. Batch Processor
**Location**: `batch-processor/`
- **Stack**: Node.js, TypeScript.
- **Build**: `npm run build` (if applicable, or run directly via ts-node)
- **Test**: `npm test` (Includes e2e simulation)
- **Jobs**:
  - `aggregateMetrics`: Hourly
  - `ruleBasedScoring`: Daily
  - `llmAnalysis`: Weekly
  - `cohortDetection`: Weekly

### 3. VS Code Extension
**Location**: `copilot-analytics-vscode/`
- **Build**: `npm run compile`
- **Package**: `npx vsce package`
- **Lint**: `npm run lint`

### 4. IntelliJ Plugin
**Location**: `copilot-analytics-intellij/`
- **Stack**: Kotlin, Gradle.
- **Build**: `./gradlew buildPlugin`
- **Test**: `./gradlew test`

### 5. Cursor Analytics Hooks
**Location**: `cursor-analytics-hooks/`
- **Stack**: TypeScript.
- **Build**: `npm run build`
- **Test**: `npm test`

## Database & Security

### Schema
Managed via Supabase migrations in `supabase/migrations/`.
- **Core Tables**: `events`, `users`, `daily_metrics`, `quality_scores`, `cohorts`, `audit_logs`.
- **RLS**: Row-Level Security is enforced. See `security_hardening.sql`.

### Encryption
All prompt/response data is encrypted *client-side* using AES-256-CBC.
- **Key**: 32-byte (64 hex char) string.
- **IV**: 16-byte random IV, prepended to ciphertext.
- **Service**: `EncryptionService` ensures consistency across all clients.

### Deployment
- The `analytics-dashboard` Dockerfile uses `ARG` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These must be passed as build args during docker build (handled by `docker-compose.yml`).
- `ENCRYPTION_KEY` in production should be a 64-character hex string generated via `openssl rand -hex 32`.

### Verification Scripts
- **Encryption**: Run `npx ts-node scripts/verify_encryption.ts` inside `batch-processor/` to verify end-to-end encryption compatibility between client (simulated) and server logic.
- **Deployment**: Run `./scripts/verify_deployment.sh` to verify build and tests.

## Testing Strategy
- **Unit Tests**: Required for all new logic.
- **Integration**: `batch-processor` has a simulated e2e flow.
- **Verification**: Ensure all components build before submitting.

## Handoff Protocol
When finishing a session, update `HANDOFF.md` with:
- Current branch and commit.
- Achievements.
- Next steps for the following agent.
