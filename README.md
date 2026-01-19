# Copilot Analytics & Coaching Platform

A comprehensive platform to track, analyze, and improve GitHub Copilot usage across your engineering team.

## Components

- **VS Code Extension**: Captures telemetry from VS Code.
- **JetBrains Plugin**: Captures telemetry from IntelliJ/PyCharm.
- **Cursor Hooks**: Captures telemetry from Cursor AI editor.
- **Batch Processor**: Aggregates data, runs scoring algorithms, and detects cohorts.
- **Analytics Dashboard**: Next.js web application for visualizing insights.

## Setup & Deployment

### Encryption Key
The platform uses a standardized AES-256-CBC encryption scheme to protect sensitive prompt data.
You must generate a 32-byte (64 character) Hex string for the `ENCRYPTION_KEY`.

**Generate a key:**
```bash
openssl rand -hex 32
```

Set this key as `ENCRYPTION_KEY` in the environment variables for:
- Batch Processor
- VS Code Extension (via Settings or Env)
- JetBrains Plugin (via Env)
- Cursor Hooks (via Env)

### VS Code Extension
1. Install dependencies: `cd copilot-analytics-vscode && npm install`
2. Package: `npx vsce package`
3. Install the `.vsix` file in VS Code.

### JetBrains Plugin
1. Build: `cd copilot-analytics-intellij && ./gradlew buildPlugin`
2. Install the `.zip` from `build/distributions/` in IntelliJ.

### Batch Processor
1. `cd batch-processor`
2. `npm install`
3. `npm start` (Runs the scheduler)

### Dashboard
1. `cd analytics-dashboard`
2. `npm install`
3. `npm run dev`

## Architecture
See `docs/` for detailed architectural plans.
