# Deployment Guide

This guide describes how to deploy the Copilot Analytics Platform using Docker Compose for production environments.

## Prerequisites

- Docker Engine (v20.10+)
- Docker Compose (v2.0+)
- Supabase Project (or self-hosted Supabase instance)
- SMTP Server (for email notifications)
- LLM Provider API Key (Anthropic, OpenAI, or Gemini)

## Environment Variables

Create a `.env.production` file (or set these in your CI/CD pipeline) with the following variables:

### General
- `NODE_ENV=production`

### Supabase (Database)
- `SUPABASE_URL`: The URL of your Supabase project (e.g., `https://xyz.supabase.co`).
- `SUPABASE_ANON_KEY`: The anonymous public key.
- `SUPABASE_SERVICE_ROLE_KEY`: The service role key (keep secret!).
- `NEXT_PUBLIC_SUPABASE_URL`: Same as `SUPABASE_URL` (required for Dashboard build).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Same as `SUPABASE_ANON_KEY` (required for Dashboard build).

### LLM Provider
- `LLM_PROVIDER`: One of `anthropic`, `openai`, `gemini` (default: `anthropic`).
- `ANTHROPIC_API_KEY`: Required if provider is `anthropic`.
- `OPENAI_API_KEY`: Required if provider is `openai`.
- `GOOGLE_API_KEY`: Required if provider is `gemini`.

### Email Service (SMTP)
- `SMTP_HOST`: Hostname of your SMTP server (e.g., `smtp.sendgrid.net`).
- `SMTP_PORT`: Port (e.g., `587`).
- `SMTP_USER`: Username.
- `SMTP_PASS`: Password.

### Encryption
- `ENCRYPTION_KEY`: A 32-byte hex string or a strong passphrase used for data encryption in the database.

## Deployment Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd copilot-analytics-platform
   ```

2. **Prepare Environment:**
   Create `.env` file with the variables listed above.

3. **Database Migrations:**
   Ensure your Supabase project has the latest schema. You can run migrations using the Supabase CLI:
   ```bash
   supabase db reset --remote
   # OR
   supabase db push
   ```

4. **Deploy Edge Functions:**
   Deploy the `ingest-events` function:
   ```bash
   supabase functions deploy ingest-events --no-verify-jwt
   ```

5. **Start Services:**
   Run the production Docker Compose configuration:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

6. **Verify Deployment:**
   - Dashboard: Access `http://localhost:3000` (or your domain).
   - Batch Processor: Check health at `http://localhost:8080/health`.

## Monitoring & Logs

- View logs for all services:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f
  ```
- View logs for a specific service:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f batch-processor
  ```

## Updates

To update the application:
1. Pull the latest code.
2. Re-run `docker compose -f docker-compose.prod.yml up -d --build`.
   This will rebuild the images and recreate containers with the new code.
