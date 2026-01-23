# Deployment Guide

This document describes how to deploy the Copilot Analytics Platform to a production environment.

## Architecture

The production deployment consists of the following services running via Docker Compose:
- **Dashboard**: The Next.js web application.
- **Batch Processor**: The Node.js backend for data aggregation, scoring, and cohort detection.
- **Supabase**: Managed database (external).

## Prerequisites

1.  **Server**: A Linux server (e.g., Ubuntu) with:
    -   Git installed.
    -   Docker and Docker Compose installed.
    -   SSH access.
2.  **GitHub Secrets**: The repository must have the following secrets configured:
    -   `HOST`: The IP address or hostname of the server.
    -   `USERNAME`: The SSH username (e.g., `ubuntu`).
    -   `KEY`: The SSH private key.
    -   `PORT`: SSH port (default 22).
    -   `SUPABASE_URL`: Your Supabase project URL.
    -   `SUPABASE_ANON_KEY`: Your Supabase anonymous key.
    -   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
    -   `LLM_PROVIDER`: `anthropic`, `openai`, or `google`.
    -   `ANTHROPIC_API_KEY`: API key for Anthropic (if used).
    -   `OPENAI_API_KEY`: API key for OpenAI (if used).
    -   `GOOGLE_API_KEY`: API key for Google Gemini (if used).
    -   `SMTP_HOST`: SMTP server host.
    -   `SMTP_PORT`: SMTP server port.
    -   `SMTP_USER`: SMTP username.
    -   `SMTP_PASS`: SMTP password.
    -   `ENCRYPTION_KEY`: 32-byte hex string for data encryption.

## Deployment Workflow

The deployment is automated using GitHub Actions (`.github/workflows/deploy.yml`).

1.  **Trigger**: Pushing to the `main` branch triggers the deployment.
2.  **Process**:
    -   The workflow connects to the server via SSH.
    -   It clones the repository (if not present) into `copilot-analytics-platform`.
    -   It generates a `.env` file from the GitHub Secrets.
    -   It executes `scripts/deploy.sh`.
3.  **Script Actions**:
    -   Pulls the latest code from `main`.
    -   Runs `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`.
    -   Prunes unused Docker images.

## Manual Deployment

You can also deploy manually by SSHing into the server:

1.  Navigate to the project directory:
    ```bash
    cd copilot-analytics-platform
    ```
2.  Ensure `.env` file is present and up-to-date.
3.  Run the deployment script:
    ```bash
    ./scripts/deploy.sh
    ```

## Troubleshooting

-   **Logs**: View logs using `docker compose -f docker-compose.prod.yml logs -f`.
-   **Health Checks**: The services expose health check endpoints:
    -   Dashboard: `GET /api/health`
    -   Batch Processor: `GET /health`
