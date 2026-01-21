# Deployment Guide

This guide describes how to deploy the Copilot Analytics Platform to a production environment.

## Prerequisites

1.  **Server**: A Linux server (e.g., Ubuntu 22.04) with Docker and Docker Compose installed.
2.  **Domain**: (Optional) A domain name pointing to the server IP.
3.  **Supabase**: A Supabase project with the schema applied.
4.  **GitHub Secrets**: The following secrets must be configured in the GitHub repository:
    - `DEPLOY_HOST`: The IP address or hostname of the server.
    - `DEPLOY_USER`: The SSH username (e.g., `ubuntu`).
    - `DEPLOY_KEY`: The SSH private key for the user.
    - `DEPLOY_PORT`: The SSH port (default `22`).

## Initial Setup on Server

1.  SSH into your server:
    ```bash
    ssh user@your-server-ip
    ```

2.  Clone the repository:
    ```bash
    git clone https://github.com/your-org/copilot-analytics-platform.git ~/copilot-analytics-platform
    cd ~/copilot-analytics-platform
    ```

3.  Create the `.env` file:
    ```bash
    cp .env.example .env
    nano .env
    ```
    Fill in the required environment variables (Supabase URL, Keys, SMTP settings, etc.).

4.  Run the initial deployment manually to ensure everything works:
    ```bash
    chmod +x scripts/deploy.sh
    ./scripts/deploy.sh
    ```

## Automatic Deployment

The repository is configured with GitHub Actions to automatically deploy changes pushed to the `main` branch.

### Workflow

1.  A push to `main` triggers the `Deploy to Production` workflow.
2.  The workflow connects to the server via SSH.
3.  It executes `scripts/deploy.sh`, which:
    - Pulls the latest code.
    - Rebuilds Docker containers (`docker compose up -d --build`).
    - Verifies health endpoints (`/api/health` for Dashboard, `/health` for Batch Processor).

## Troubleshooting

-   **Check Logs**:
    ```bash
    docker compose logs -f
    ```
-   **Manual Restart**:
    ```bash
    docker compose restart
    ```
-   **Health Check Failure**: If the deployment script fails, check the logs of the failing service (`dashboard` or `batch-processor`) to diagnose the issue.
