# Deployment Guide

This guide describes how to deploy the Copilot Analytics Platform to a production environment.

## Prerequisites

- **Docker** and **Docker Compose** installed on the server.
- **Git** (optional, for pulling updates).
- **Supabase Project**: You need a Supabase project with the database schema applied.
- **LLM Provider API Key**: Anthropic, OpenAI, or Gemini.
- **SMTP Server**: For sending emails.

## Configuration

1. **Clone the repository** (if not already on the server):
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Environment Variables**:
   Create a `.env` file in the root directory based on `.env.example`.
   ```bash
   cp .env.example .env
   nano .env
   ```
   Fill in all the required values:
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep secret!).
   - `LLM_PROVIDER`: e.g., `anthropic`.
   - `ANTHROPIC_API_KEY`: Your API key.
   - `SMTP_...`: Your email server settings.
   - `ENCRYPTION_KEY`: A random 32-character string for data encryption.

## Deployment

To deploy or update the application, run the deployment script:

```bash
./scripts/deploy.sh
```

This script will:
1. Pull the latest code from the `main` branch (if git is initialized).
2. Build the Docker images for `dashboard` and `batch-processor`.
3. Start the services in detached mode (`-d`).
4. Prune unused Docker images to save space.

## Services

- **Dashboard**: Accessible at `http://localhost:3000` (or your configured domain/proxy).
- **Batch Processor**: Runs in the background. Health check at `http://localhost:8080/health`.

## Monitoring

Check logs using Docker Compose:

```bash
docker compose -f docker-compose.prod.yml logs -f
```
