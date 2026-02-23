# Deployment Documentation

## Prerequisites

- **Docker**: Ensure Docker and Docker Compose are installed and running.
- **Node.js**: Ensure Node.js (v18+) is installed for local testing.
- **Environment Variables**: You must set up the necessary environment variables.

## Environment Variables

The following environment variables are required for deployment and verification:

- `SUPABASE_URL`: The URL of your Supabase project.
- `SUPABASE_ANON_KEY`: The anonymous key for your Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY`: The service role key for your Supabase project (for batch processor).
- `ANTHROPIC_API_KEY`: API key for Anthropic (LLM provider).
- `LLM_PROVIDER`: The LLM provider to use (default: `anthropic`).

Optional variables (for production/staging):
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: For email service.
- `ENCRYPTION_KEY`: For data encryption.
- `OPENAI_API_KEY`, `GOOGLE_API_KEY`: If using other LLM providers.

You can set these in a `.env` file in the root directory.

## Verification

To verify the codebase before deployment, run:

```bash
./verify_deployment.sh
```

This script will:
1. Check for required environment variables.
2. Install dependencies for `analytics-dashboard` and `batch-processor`.
3. Run unit tests for both services.
4. Build the Docker images.

## Staging Deployment

To deploy to the staging environment (simulated), run:

```bash
./deploy_staging.sh
```

This script will:
1. Run `./verify_deployment.sh` to ensure the build is stable.
2. If verification passes, it will simulate tagging and pushing Docker images to a staging registry.
3. It will simulate updating the staging Kubernetes deployment.

## Production Deployment

(Add production deployment steps here when defined)
