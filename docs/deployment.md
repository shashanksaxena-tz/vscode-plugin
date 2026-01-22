# Deployment Guide

This guide describes how to deploy the Copilot Analytics & Coaching Platform in a production environment.

## Prerequisites

- **Docker** and **Docker Compose** installed on the server.
- **Git** to clone the repository.
- **Supabase Project** with URL and Keys.
- **LLM Provider API Key** (Anthropic, OpenAI, or Gemini).
- **SMTP Server** credentials for email notifications.

## Architecture

The system consists of the following services defined in `docker-compose.prod.yml`:

1.  **Dashboard** (`dashboard:3000`): Next.js web application.
2.  **Batch Processor** (`batch-processor:8080`): Node.js background service for metrics aggregation, scoring, and analysis.
3.  **Prometheus** (`prometheus:9090`): Metrics collection and alerting.
4.  **Alertmanager** (`alertmanager:9093`): Alert handling and notification routing.
5.  **Grafana** (`grafana:3001`): Visualization dashboards.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LLM Provider
LLM_PROVIDER=anthropic # or openai, gemini
ANTHROPIC_API_KEY=your-anthropic-key
# OPENAI_API_KEY=your-openai-key
# GOOGLE_API_KEY=your-google-key

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass

# Security
ENCRYPTION_KEY=your-32-byte-key # or 64-char hex string
```

## Deployment Steps

1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd copilot-analytics-platform
    ```

2.  **Configure Environment**:
    Create the `.env` file as described above.

3.  **Run Deployment Script**:
    The `scripts/deploy.sh` script handles pulling changes, building images, and starting services.
    ```bash
    ./scripts/deploy.sh
    ```

4.  **Verify Deployment**:
    Run the verification script to check service health.
    ```bash
    ./scripts/verify_deployment.sh
    ```

## Monitoring

### Grafana
Access Grafana at `http://<server-ip>:3001`.
- **Username**: `admin`
- **Password**: `admin` (Change on first login)

Dashboards are pre-provisioned. Go to **Dashboards** > **Copilot Analytics System**.

### Prometheus & Alerting
- **Prometheus** is available at `http://<server-ip>:9090`.
- **Alertmanager** is available at `http://<server-ip>:9093`.

Alert rules are defined in `monitoring/alert_rules.yml`. Notifications are configured in `monitoring/alertmanager.yml`.
