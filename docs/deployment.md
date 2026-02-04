# Deployment Guide

This document outlines the deployment process for the Copilot Analytics Platform.

## Prerequisites

- Docker and Docker Compose (v2) installed on the target machine.
- Access to the target server via SSH.
- Required API keys and configuration values (Supabase, LLM Providers, SMTP).

## Configuration

1.  **Environment Variables**:
    Copy the `.env.example` file to `.env` in the root directory:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and fill in the required values:
    - **Supabase**: URL and Keys from your Supabase project settings.
    - **LLM Provider**: Choose 'anthropic', 'openai', or 'gemini' and provide the corresponding API key.
    - **SMTP**: Email server details for sending notifications.
    - **Encryption**: A 32-byte hex string for encrypting sensitive data.

2.  **Docker Compose**:
    The production configuration is located in `docker-compose.prod.yml`. This file defines the services, networks, and volumes for the staging/production environment.

## Deployment Scripts

We provide automation scripts located in the `scripts/` directory.

### Deploy to Staging

The `deploy_staging.sh` script automates the deployment process:
1.  Checks for the `.env` file and required variables.
2.  Builds the Docker images.
3.  Starts the services in detached mode using `docker-compose.prod.yml`.
4.  Runs the verification script.

**Usage:**
```bash
./scripts/deploy_staging.sh
```

### Verification

The `verify_deployment.sh` script checks the health of the deployed services:
1.  Checks if critical configuration files exist.
2.  Polls the health endpoints of the Dashboard and Batch Processor.

**Usage:**
```bash
./scripts/verify_deployment.sh
```

**Options:**
- `--static-only`: Only checks for configuration files, skipping network health checks. Useful for CI/CD pipelines where services might not be running.

## Services

- **Dashboard**: Next.js application running on port 3000.
    - Health check: `/api/health`
- **Batch Processor**: Node.js background service running on port 8080.
    - Health check: `/health`

## Troubleshooting

- **Services failing to start**: Check logs with `docker compose -f docker-compose.prod.yml logs`.
- **Database connection errors**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
- **Health check failures**: Ensure ports 3000 and 8080 are not blocked by a firewall.
