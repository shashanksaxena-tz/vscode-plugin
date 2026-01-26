# Deployment Guide

This project uses GitHub Actions and Docker Compose for deployment.

## Prerequisites

1.  **Docker & Docker Compose**: Installed on the production server.
2.  **Git**: Installed on the server.
3.  **SSH Access**: Key-based authentication enabled.

## Server Setup

1.  Clone the repository:
    ```bash
    cd ~
    git clone https://github.com/your-org/copilot-analytics.git
    cd copilot-analytics
    ```

2.  Create `.env` file with required secrets:
    ```bash
    cp .env.example .env
    # Edit .env with production values
    ```

    Required Environment Variables:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `LLM_PROVIDER` (e.g., `anthropic`)
    - `ANTHROPIC_API_KEY`
    - `OPENAI_API_KEY`
    - `GOOGLE_API_KEY`
    - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
    - `ENCRYPTION_KEY` (32-byte hex string)

## GitHub Secrets

Configure the following secrets in the GitHub repository:

- `DEPLOY_HOST`: IP address or hostname of the production server.
- `DEPLOY_USER`: SSH username (e.g., `ubuntu`).
- `DEPLOY_KEY`: SSH private key for the user.

## Deployment Process

The deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`).

1.  Push changes to `main` branch.
2.  GitHub Action triggers `scripts/deploy.sh` on the server via SSH.
3.  The script:
    - Pulls the latest code.
    - Rebuilds and restarts containers using `docker-compose.prod.yml`.
    - Prunes unused Docker images.

## Manual Deployment

You can manually deploy by SSHing into the server and running:

```bash
cd ~/copilot-analytics
./scripts/deploy.sh
```
