# Deployment Guide

This document outlines the deployment process for the Copilot Analytics Platform.

## Prerequisites

- **Docker & Docker Compose**: Ensure Docker is installed and running on the target server.
- **Supabase Project**: A Supabase project with the database schema applied (see `supabase/migrations/`).
- **SMTP Server**: For email notifications.
- **LLM Provider API Key**: For qualitative analysis (Anthropic, OpenAI, or Gemini).

## Environment Variables

The following environment variables are required for deployment. You should set these in your CI/CD environment or a `.env` file on the server.

| Variable | Description |
| :--- | :--- |
| `SUPABASE_URL` | The URL of your Supabase project. |
| `SUPABASE_ANON_KEY` | The anonymous public key. |
| `SUPABASE_SERVICE_ROLE_KEY` | The service role key (for backend operations). |
| `ENCRYPTION_KEY` | A 32-byte hex string for encrypting sensitive data. |
| `SMTP_HOST` | SMTP server hostname. |
| `SMTP_PORT` | SMTP server port (e.g., 587). |
| `SMTP_USER` | SMTP username. |
| `SMTP_PASS` | SMTP password. |
| `LLM_PROVIDER` | `anthropic`, `openai`, or `gemini`. |
| `ANTHROPIC_API_KEY` | Required if provider is Anthropic. |
| `OPENAI_API_KEY` | Required if provider is OpenAI. |
| `GOOGLE_API_KEY` | Required if provider is Gemini. |

## Deployment Steps

### Staging Deployment

We provide a script to automate the deployment process. This script checks for required environment variables, builds the Docker images, and starts the services.

1.  **Clone the repository** to the staging server.
2.  **Export the environment variables**.
3.  **Run the deployment script**:

```bash
./scripts/deploy_staging.sh
```

This will:
- Verify all required environment variables are set.
- Build the `dashboard` and `batch-processor` images using `docker-compose.prod.yml`.
- Start the services in detached mode (`-d`).
- Perform health checks on the services.

### Manual Deployment

You can also deploy manually using Docker Compose:

```bash
# Export variables
export SUPABASE_URL=...
# ...

# Run Docker Compose
docker compose -f docker-compose.prod.yml up -d --build
```

## Troubleshooting

-   **Build Failures**: Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are available during the build phase, as the Next.js dashboard requires them for static generation.
-   **Health Check Failures**: Check container logs using `docker compose logs dashboard` or `docker compose logs batch-processor`.
-   **Database Connection Issues**: Verify the Supabase keys and ensure the database is accessible from the server.
