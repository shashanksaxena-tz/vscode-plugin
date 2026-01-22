# Deployment Guide

This document outlines the deployment process for the Copilot Analytics Platform.

## Prerequisites

- **Server**: A Linux server with Docker and Docker Compose installed.
- **Git**: Installed on the server.
- **GitHub Secrets**: Configured in the repository for CI/CD.

## Server Setup

1.  **Clone the Repository**:
    SSH into your server and clone the repository into `copilot-analytics-platform`.
    ```bash
    git clone https://github.com/your-org/copilot-analytics-platform.git
    cd copilot-analytics-platform
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root directory with the following variables:
    ```env
    # Supabase Configuration
    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

    # LLM Configuration
    LLM_PROVIDER=anthropic
    ANTHROPIC_API_KEY=your_anthropic_key
    OPENAI_API_KEY=your_openai_key
    GOOGLE_API_KEY=your_google_key

    # Email Service (SMTP)
    SMTP_HOST=smtp.example.com
    SMTP_PORT=587
    SMTP_USER=your_smtp_user
    SMTP_PASS=your_smtp_pass

    # Security
    ENCRYPTION_KEY=your_32_byte_hex_key
    ```

3.  **Make Scripts Executable**:
    Ensure the deployment script is executable.
    ```bash
    chmod +x scripts/deploy.sh
    ```

## CI/CD Pipeline

The project uses GitHub Actions for continuous deployment. On every push to the `main` branch, the `Deploy` workflow is triggered.

### Required GitHub Secrets

Configure the following secrets in your GitHub repository settings:

- `DEPLOY_HOST`: IP address or hostname of your production server.
- `DEPLOY_USER`: SSH username (e.g., `ubuntu`).
- `DEPLOY_KEY`: SSH private key for the user.
- `DEPLOY_PORT`: SSH port (usually `22`).

## Manual Deployment

To manually deploy the application, SSH into the server and run:

```bash
cd copilot-analytics-platform
./scripts/deploy.sh
```

## Monitoring

The deployment includes Prometheus and Grafana for monitoring.

- **Prometheus**: `http://your-server-ip:9090`
- **Grafana**: `http://your-server-ip:3001`
- **Dashboard**: `http://your-server-ip:3000`
- **Batch Processor Health**: `http://your-server-ip:8080/health`
