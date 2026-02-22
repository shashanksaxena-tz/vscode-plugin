# Deployment Guide

This document provides instructions for deploying the Copilot Analytics Platform to staging and production environments.

## Prerequisites

- **Docker & Docker Compose**: Ensure Docker is installed and running.
- **Node.js**: Required for running verification scripts.
- **Environment Variables**: A `.env` file must be present in the root directory.

## Deployment Scripts

We provide scripts to automate the deployment process.

### 1. Verify Deployment

Before deploying, run the verification script to ensure all tests pass and the application builds correctly.

```bash
./scripts/verify_deployment.sh
```

This script will:
- Check for required environment variables.
- Run tests for `analytics-dashboard` and `batch-processor`.
- Build the Docker images.

### 2. Deploy to Staging

To deploy to the staging environment (simulation):

```bash
./scripts/deploy_staging.sh
```

This script will:
- Run the verification script first.
- Tag the Docker images with `:staging`.
- Push the images to the container registry (simulated).

## Environment Configuration

Ensure your `.env` file contains the following variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `LLM_PROVIDER`
- `OPENAI_API_KEY` (if using OpenAI)
- `GOOGLE_API_KEY` (if using Gemini)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `ENCRYPTION_KEY`

## Troubleshooting

- **Build Failures**: Check the Docker build logs for errors. Ensure Docker is running.
- **Test Failures**: Run `npm test` inside the component directory to debug test failures.
