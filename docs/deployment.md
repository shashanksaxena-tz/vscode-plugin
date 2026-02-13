# Deployment Guide

This guide describes how to deploy the Copilot Analytics Platform.

## Prerequisites

- **Docker & Docker Compose**: Ensure Docker is installed and running.
- **Supabase Project**: You need a Supabase project with the database schema applied.
- **LLM API Key**: An API key from Anthropic, OpenAI, or Google.
- **SMTP Server**: SMTP credentials for sending email notifications.
- **Encryption Key**: A 32-byte hex string for encrypting prompt data.

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`.

Required variables:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
ENCRYPTION_KEY=your-32-byte-hex-key

# LLM Provider (one of: anthropic, openai, gemini)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-api-key
# OPENAI_API_KEY=
# GOOGLE_API_KEY=

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-smtp-password

# Dashboard Build Args (Must be provided to build context)
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
```

## Deployment Steps

1.  **Clone the Repository**
    ```bash
    git clone <repo-url>
    cd <repo-dir>
    ```

2.  **Configure Environment**
    Copy `.env.example` to `.env` and fill in the values.
    ```bash
    cp .env.example .env
    ```

3.  **Run with Docker Compose**
    Build and start the services.
    ```bash
    docker compose up --build -d
    ```

4.  **Verify Deployment**
    - **Dashboard**: Visit `http://localhost:3000`. Login with a valid user.
    - **Batch Processor**: Check logs for successful startup.
      ```bash
      docker compose logs -f batch-processor
      ```
    - **Health Check**:
      ```bash
      curl http://localhost:8080/health
      ```

## Database Migrations

Ensure all migrations in `supabase/migrations/` are applied to your Supabase project. You can use the Supabase CLI or the dashboard SQL editor.

## Troubleshooting

-   **Dashboard Build Fails**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correctly passed as build arguments or environment variables during the build process.
-   **Email Errors**: Verify SMTP credentials and port.
-   **Database Connection**: Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
