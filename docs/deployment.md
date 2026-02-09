# Deployment Guide

This guide outlines the steps to deploy the Copilot Analytics platform to a staging environment.

## Prerequisites

- **Docker**: Ensure Docker and Docker Compose are installed on the deployment server.
- **Node.js**: Required to run build scripts if necessary, though Docker handles most dependencies.
- **Supabase**: A Supabase project must be set up with the required schema (see `docs/plans/2026-01-18-implementation-spec-part2.md`).

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM Provider Configuration
LLM_PROVIDER=anthropic # or openai, gemini
ANTHROPIC_API_KEY=your_anthropic_api_key
# OPENAI_API_KEY=your_openai_api_key
# GOOGLE_API_KEY=your_google_api_key

# SMTP Configuration (for email notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Security
ENCRYPTION_KEY=your_encryption_key_32_chars
```

## Deployment Steps

1.  **Clone the Repository**:
    Clone the repository to the staging server.

2.  **Configure Environment**:
    Create the `.env` file as described above.

3.  **Run Deployment Script**:
    Execute the deployment script to build and start the services.
    ```bash
    ./scripts/deploy_staging.sh
    ```

    This script will:
    - Verify all required environment variables are set.
    - Check for Docker installation.
    - Build the Docker images for `analytics-dashboard` and `batch-processor`.
    - Start the services in detached mode using `docker compose`.

4.  **Verify Deployment**:
    - **Dashboard**: Access `http://localhost:3000` (or the server's IP).
    - **Batch Processor**: Check health at `http://localhost:8080/health`.

## Troubleshooting

- **Missing Environment Variables**: The script will exit if required variables are missing. Check your `.env` file.
- **Docker Errors**: Ensure Docker is running and the user has permissions to execute docker commands.
- **Build Failures**: Check the build logs for any errors during `npm install` or compilation.
