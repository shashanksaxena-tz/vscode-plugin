# Deployment Guide

## Prerequisites

1.  **Server**: A Linux server (e.g., Ubuntu) with Docker and Docker Compose installed.
2.  **SSH Access**: SSH key pair configured for accessing the server.
3.  **Environment Variables**: The following variables must be set on the server or in the `.env` file:
    -   `SUPABASE_URL`
    -   `SUPABASE_ANON_KEY`
    -   `SUPABASE_SERVICE_ROLE_KEY`
    -   `LLM_PROVIDER`
    -   `ANTHROPIC_API_KEY` (or other provider keys)
    -   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
    -   `ALERT_EMAIL_TO`
    -   `ENCRYPTION_KEY`
    -   `GRAFANA_PASSWORD`

## Deployment Steps

### Automatic Deployment

The project is configured to deploy automatically on push to `main` via GitHub Actions.

1.  Configure the following GitHub Secrets:
    -   `HOST`: Server IP address
    -   `USERNAME`: SSH username
    -   `KEY`: SSH private key
    -   `PORT`: SSH port (default 22)

### Manual Deployment

1.  SSH into the server.
2.  Clone the repository or pull the latest changes.
3.  Run the deployment script:
    ```bash
    ./scripts/deploy.sh
    ```

## Monitoring

-   **Grafana**: `http://<server-ip>:3001` (Login: admin / configured password)
-   **Prometheus**: `http://<server-ip>:9090`
-   **Alertmanager**: `http://<server-ip>:9093`

## Troubleshooting

-   Check container logs: `docker compose -f docker-compose.prod.yml logs -f`
-   Verify configuration: `./scripts/verify_production_config.sh`
