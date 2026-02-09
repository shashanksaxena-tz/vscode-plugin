# Copilot Analytics Deployment Scripts

This directory contains scripts for deploying the Copilot Analytics platform.

## `deploy_staging.sh`

This script automates the deployment process for the staging environment. It performs the following checks:
1.  **Environment Variables**: Checks for essential environment variables like `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LLM_PROVIDER`, etc.
2.  **Docker**: Verifies that Docker is installed.
3.  **Build**: Builds Docker images using `docker compose build`.
4.  **Run**: Starts the services using `docker compose up -d`.

### Usage

1.  Create a `.env` file in the root directory with the required environment variables.
2.  Run the script:
    ```bash
    ./scripts/deploy_staging.sh
    ```

### Prerequisites

- Docker and Docker Compose installed.
- `.env` file configured.
