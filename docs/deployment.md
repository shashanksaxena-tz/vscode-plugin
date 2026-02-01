# Deployment Guide

This document outlines the deployment process for the Copilot Analytics Platform staging environment.

## Prerequisites

1.  **Docker & Docker Compose**: Ensure Docker and Docker Compose are installed on the deployment server.
2.  **Environment Variables**: The following environment variables must be set in the shell or CI/CD environment:

    *   `SUPABASE_URL`: The URL of your Supabase project.
    *   `SUPABASE_ANON_KEY`: The anonymous key for your Supabase project.
    *   `SUPABASE_SERVICE_ROLE_KEY`: The service role key for Supabase (backend access).
    *   `LLM_PROVIDER`: The LLM provider to use (e.g., `anthropic`, `openai`).
    *   `ANTHROPIC_API_KEY`: API key for Anthropic (if used).
    *   `OPENAI_API_KEY`: API key for OpenAI (if used).
    *   `GOOGLE_API_KEY`: API key for Google Gemini (if used).
    *   `SMTP_HOST`: SMTP server host for email notifications.
    *   `SMTP_PORT`: SMTP server port.
    *   `SMTP_USER`: SMTP username.
    *   `SMTP_PASS`: SMTP password.
    *   `ENCRYPTION_KEY`: A 32-character string used for encrypting sensitive data in the database.

## Deployment Steps

To deploy the application to the staging environment, use the provided script:

```bash
./scripts/deploy_staging.sh
```

### What the script does:

1.  **Checks Environment**: Verifies that all required environment variables are set.
2.  **Builds & Starts**: Runs `docker compose -f docker-compose.prod.yml up --build -d` to build fresh images and start containers.
3.  **Health Checks**: Polls the `/health` endpoints of the Dashboard (port 3000) and Batch Processor (port 8080) to ensure services are running correctly.

## Manual Deployment

If you prefer to run commands manually:

```bash
# 1. Export variables (or use a .env file, but be careful not to commit it)
export SUPABASE_URL=...
# ... export others ...

# 2. Run Docker Compose
docker compose -f docker-compose.prod.yml up --build -d
```

## Troubleshooting

*   **Health Check Failures**: Check container logs using `docker compose -f docker-compose.prod.yml logs dashboard` or `logs batch-processor`.
*   **Database Connection Errors**: Ensure the Supabase URL and keys are correct and the Supabase instance is reachable.
*   **Port Conflicts**: Ensure ports 3000 and 8080 are not in use by other services.
