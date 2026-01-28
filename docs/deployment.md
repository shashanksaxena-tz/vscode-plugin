# Deployment Guide

This guide describes how to deploy the Copilot Analytics Platform to a staging or production environment.

## Prerequisites

- Docker and Docker Compose installed on the target machine.
- Access to the target server (SSH).
- Environment variables configured in a `.env` file.

## Environment Variables

Create a `.env` file in the root directory based on `.env.example` (if available) or the following template:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM Providers
LLM_PROVIDER=anthropic # or openai, gemini
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass

# Security
ENCRYPTION_KEY=your_32_char_encryption_key
```

## Deployment Scripts

We provide helper scripts in the `scripts/` directory:

### 1. Staging Deployment

To deploy to staging (or production if configured), run:

```bash
./scripts/deploy_staging.sh
```

This script will:
1.  Check for the `.env` file.
2.  Pull the latest code from `main` (if in a git repo).
3.  Build and start services using `docker-compose.prod.yml`.
4.  Prune unused Docker images.

### 2. Verify Deployment

To verify that services are running and healthy:

```bash
./scripts/verify_deployment.sh
```

This script checks:
- Docker container status.
- Dashboard health endpoint (`/api/health`).
- Batch Processor health endpoint (`/health`).

### 3. End-to-End Simulation (Logic Verification)

To verify the data processing pipeline logic without a full deployment:

```bash
./scripts/simulate_e2e.sh
```

This runs the integration tests in `batch-processor` that simulate the flow of data from Supabase -> Aggregation -> Scoring -> Cohort Detection.
