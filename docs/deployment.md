# Deployment Guide

This document outlines the steps for deploying the Copilot Analytics & Coaching Platform.

## Prerequisites

*   **Docker** and **Docker Compose** installed on the target machine.
*   **Node.js 18+** (for running verification scripts locally, though Docker handles the runtime).
*   **Git** for pulling the repository.

## Environment Variables

The following environment variables are required. Create a `.env` file in the root directory.

| Variable | Description |
| :--- | :--- |
| `SUPABASE_URL` | The URL of your Supabase project. |
| `SUPABASE_ANON_KEY` | The anonymous key for your Supabase project (public). |
| `SUPABASE_SERVICE_ROLE_KEY` | The service role key for backend operations (keep secret). |
| `ANTHROPIC_API_KEY` | API Key for Anthropic (used for LLM analysis). |
| `LLM_PROVIDER` | (Optional) `anthropic` (default), `openai`, or `gemini`. |
| `OPENAI_API_KEY` | (Optional) Required if `LLM_PROVIDER` is `openai`. |
| `GOOGLE_API_KEY` | (Optional) Required if `LLM_PROVIDER` is `gemini`. |
| `SMTP_HOST` | SMTP server host for sending emails. |
| `SMTP_PORT` | SMTP server port. |
| `SMTP_USER` | SMTP username. |
| `SMTP_PASS` | SMTP password. |
| `ENCRYPTION_KEY` | A secret key used for encrypting sensitive data in the database. |

## Verification Script

Before deploying, run the verification script to ensure the environment is correctly configured and the code passes all tests.

```bash
./verify_deployment.sh
```

This script will:
1.  Check for the presence of all required environment variables.
2.  Verify Docker installation.
3.  Install dependencies and run unit tests for both `analytics-dashboard` and `batch-processor`.
4.  Attempt to build the Docker images.

## Staging Deployment

To deploy to the staging environment (simulated), use the deployment script:

```bash
./deploy_staging.sh
```

This script will:
1.  Run the verification script.
2.  Pull the latest code from `main` (simulated).
3.  Build the Docker images.
4.  Tag the images for staging (simulated).
5.  Push images to the registry and trigger deployment (simulated).

## Manual Deployment (Docker Compose)

To run the full stack locally or on a server manually:

1.  Ensure `.env` is populated.
2.  Run:

```bash
docker compose up -d --build
```

This will start:
*   `analytics-dashboard` on port `3000`.
*   `batch-processor` on port `8080`.

## Health Checks

*   **Dashboard**: `http://localhost:3000/api/health`
*   **Batch Processor**: `http://localhost:8080/health`
