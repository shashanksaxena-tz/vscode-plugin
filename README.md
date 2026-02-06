# Copilot Analytics & Coaching Platform

A comprehensive platform to track, analyze, and improve GitHub Copilot usage across your engineering team.

## Components

- **VS Code Extension**: Captures telemetry from VS Code.
- **JetBrains Plugin**: Captures telemetry from IntelliJ/PyCharm.
- **Cursor Hooks**: Captures telemetry from Cursor AI editor.
- **Batch Processor**: Aggregates data, runs scoring algorithms, detects cohorts, and sends emails.
- **Analytics Dashboard**: Next.js web application for visualizing insights.

## Key Features

### Cohort Management
Managers can group developers into "Cohorts" to provide targeted coaching and track progress collectively.
- **Access**: Navigate to the Manager Dashboard at `/dashboard/team`.
- **Create & Edit**: Define cohorts with a name, description, and coaching plan.
- **Member Management**: Add or remove team members from cohorts.
- **Synchronization**: `member_count` is automatically kept in sync via database triggers.

## Setup & Deployment

### Encryption Key
The platform uses a standardized AES-256-CBC encryption scheme to protect sensitive prompt data.
You must generate a 32-byte (64 character) Hex string for the `ENCRYPTION_KEY`.

**Generate a key:**
```bash
openssl rand -hex 32
```

Set this key as `ENCRYPTION_KEY` in the environment variables for all components.

### Docker Compose (Recommended)
You can run the Dashboard and Batch Processor using Docker Compose.

1. Create a `.env` file in the root directory with the following variables:
   ```env
   # Core Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Security
   ENCRYPTION_KEY=your_32_byte_hex_key

   # LLM Provider (for qualitative analysis)
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your_api_key

   # Email Service (for cohort notifications)
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_user
   SMTP_PASS=your_smtp_password
   ```

2. **Important**: The Next.js Dashboard requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at build time. The Dockerfile is configured to accept these as build arguments.

   If you are building manually or encountering build errors, ensure these variables are available in the build environment or passed via `--build-arg`:

   ```yaml
   # docker-compose.yml snippet
   services:
     dashboard:
       build:
         args:
           NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
           NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
   ```

3. Run the services:
   ```bash
   docker compose up --build -d
   ```

### Manual Setup

#### VS Code Extension
1. Install dependencies: `cd copilot-analytics-vscode && npm install`
2. Package: `npx vsce package`
3. Install the `.vsix` file in VS Code.

#### JetBrains Plugin
1. Build: `cd copilot-analytics-intellij && ./gradlew buildPlugin`
2. Install the `.zip` from `build/distributions/` in IntelliJ.

#### Batch Processor
1. `cd batch-processor`
2. `npm install`
3. `npm start` (Runs the scheduler)

#### Dashboard
1. `cd analytics-dashboard`
2. `npm install`
3. `npm run dev`

## Architecture
See `docs/` for detailed architectural plans.
