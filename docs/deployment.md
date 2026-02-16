# Deployment Guide

This document describes how to deploy the Copilot Analytics Platform using Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed.
- [Node.js](https://nodejs.org/) installed (for running the verification script).
- A Supabase project set up.
- API keys for your chosen LLM provider (Anthropic, OpenAI, or Google).
- SMTP credentials for email services.

## Setup

1.  **Environment Variables**:
    - Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    - Edit `.env` and fill in the required values.
        - `SUPABASE_URL`: Your Supabase project URL.
        - `SUPABASE_ANON_KEY`: Your Supabase Anon key.
        - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role key.
        - `LLM_PROVIDER`: Choose one of `anthropic`, `openai`, or `gemini`.
        - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY`: Provide the API key for your chosen provider.
        - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: SMTP server details.
        - `ENCRYPTION_KEY`: A 32-character string for encryption.

2.  **Verify Setup**:
    - Run the verification script to ensure everything is configured correctly:
        ```bash
        ./verify_deployment.sh
        ```
    - This script checks for the `.env` file, validates required variables, and verifies that the Docker images can be built successfully.

## Deployment

1.  **Build and Start Containers**:
    - Run the following command to start the application in detached mode:
        ```bash
        docker compose up -d --build
        ```

2.  **Access the Dashboard**:
    - Once the containers are running, access the dashboard at `http://localhost:3000`.

3.  **Monitor Logs**:
    - To view the logs of the running services:
        ```bash
        docker compose logs -f
        ```

## Services

- **Dashboard**: The Next.js frontend application (port 3000).
- **Batch Processor**: The Node.js backend service for data processing (port 8080).

## Troubleshooting

- **Build Failures**: Check the logs for specific error messages. Ensure Docker is running and has sufficient resources.
- **Environment Variable Errors**: Double-check your `.env` file for typos or missing values.
- **Supabase Connection Issues**: Ensure your Supabase project is active and the URL/Keys are correct.
