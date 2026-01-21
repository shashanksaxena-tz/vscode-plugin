# Deployment Guide

This guide describes the deployment process for the Copilot Analytics Platform.

## Architecture

The application is deployed as a set of Docker containers using Docker Compose. The services include:
- `dashboard`: Next.js application
- `batch-processor`: Node.js background worker and API
- `email-service`: (Integrated into batch-processor)

## Prerequisites

### Server Requirements
- Docker and Docker Compose installed
- Git installed
- User `deploy` created (or update the script path accordingly)
- Repository cloned to `/home/deploy/copilot-analytics-platform`
- `.env` file present in the project root with production secrets

### GitHub Secrets
The following secrets must be configured in the GitHub repository for the CD pipeline to work:
- `DEPLOY_HOST`: IP address or hostname of the production server
- `DEPLOY_USER`: SSH username (e.g., `deploy`)
- `DEPLOY_KEY`: SSH private key
- `DEPLOY_PORT`: SSH port (default `22`)

## Deployment Process

The deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`).

1.  **Trigger**: Pushing to the `main` branch triggers the workflow.
2.  **Action**: The workflow connects to the production server via SSH.
3.  **Script**: It executes `scripts/deploy.sh`, which performs the following:
    - Navigates to the project directory.
    - Pulls the latest code from `main`.
    - Rebuilds and restarts the containers using `docker-compose.prod.yml`.
    - Prunes unused Docker images.

## Manual Deployment

To manually deploy on the server:

```bash
ssh deploy@<server-ip>
cd /home/deploy/copilot-analytics-platform
./scripts/deploy.sh
```

## Environment Variables

Ensure the `.env` file on the server contains:

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
LLM_PROVIDER=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_API_KEY=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
ENCRYPTION_KEY=...
```
