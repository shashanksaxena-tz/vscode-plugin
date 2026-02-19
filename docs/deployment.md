# Deployment Guide

This document provides instructions for deploying the Copilot Analytics Platform.

## Prerequisites

- **Docker**: Ensure Docker and Docker Compose are installed on the target machine.
- **Node.js**: Node.js (v18+) is required for running local verification scripts (though the application runs in Docker).
- **Supabase**: A Supabase project is required. You will need the URL, Anonymous Key, and Service Role Key.
- **LLM Provider API Key**: API Key for your chosen LLM provider (Anthropic, OpenAI, or Gemini).
- **SMTP Server**: Credentials for an SMTP server to send emails.

## Environment Configuration

1.  Create a `.env` file in the root directory of the project. You can copy a sample or start from scratch.
2.  Add the following required environment variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM Provider Configuration
# Options: anthropic, openai, gemini
LLM_PROVIDER=anthropic
# Add the key for your chosen provider
ANTHROPIC_API_KEY=your_anthropic_key
# OPENAI_API_KEY=your_openai_key
# GOOGLE_API_KEY=your_gemini_key

# Email Service (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Security
# 32-character string for encryption
ENCRYPTION_KEY=your_secure_random_key_here
```

## Verification

Before deploying, it is recommended to run the verification script to ensure the environment is correctly configured and the application builds successfully.

1.  Ensure `.env` is created.
2.  Run the verification script:

```bash
chmod +x verify_deployment.sh
./verify_deployment.sh
```

This script will:
- Check for the existence of `.env`.
- Verify that all required environment variables are set.
- Check if Docker is installed.
- Attempt to build the Docker images (`docker compose build`).
- Run unit tests for `analytics-dashboard` and `batch-processor`.

If the script passes ("Verification completed successfully."), you are ready to deploy.

## Deployment

To deploy the application using Docker Compose:

1.  Run the following command in the root directory:

```bash
docker compose up -d
```

This will start the following services:
- **dashboard**: The Next.js web application (accessible at http://localhost:3000).
- **batch-processor**: The background service for processing metrics and running jobs.

2.  Verify the services are running:

```bash
docker compose ps
```

## Troubleshooting

- **Build Failures**: Check the logs of `verify_deployment.sh`. Ensure you have internet access to pull Docker images and install npm packages.
- **Database Connection Errors**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct. Ensure your machine can reach the Supabase instance.
- **Email Failures**: Check SMTP credentials and port settings.
- **Health Checks**: The services expose health check endpoints:
    - Dashboard: `http://localhost:3000/api/health`
    - Batch Processor: `http://localhost:8080/health`
