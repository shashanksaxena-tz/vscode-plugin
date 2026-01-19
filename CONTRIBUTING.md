# Contributing to Copilot Analytics

Thank you for your interest in contributing to the Copilot Analytics & Coaching Platform! We welcome contributions from the community to help improve developer productivity insights.

## Development Workflow

### Prerequisites

*   **Node.js**: v18 or higher
*   **Java**: JDK 21 (for IntelliJ Plugin)
*   **Docker**: For running the full stack
*   **Supabase**: A Supabase project (or local instance)

### Project Structure

The repository is a monorepo containing several distinct components:

*   `copilot-analytics-vscode/`: VS Code extension (TypeScript)
*   `copilot-analytics-intellij/`: JetBrains IDE plugin (Kotlin)
*   `cursor-analytics-hooks/`: Cursor AI editor hooks (TypeScript)
*   `analytics-dashboard/`: Web dashboard (Next.js, TypeScript)
*   `batch-processor/`: Backend jobs and email service (Node.js, TypeScript)
*   `supabase/`: Database migrations and Edge Functions

### Setting Up the Environment

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-org/copilot-analytics.git
    cd copilot-analytics
    ```

2.  **Environment Variables**:
    Copy `.env.example` (if available) or create a `.env` file in the root directory. You will need Supabase credentials and an encryption key.

    ```bash
    # Generate a secure encryption key
    openssl rand -hex 32
    ```

### Component-Specific Instructions

#### VS Code Extension
```bash
cd copilot-analytics-vscode
npm install
npm run compile
# To debug, press F5 in VS Code with the project open
```

#### IntelliJ Plugin
```bash
cd copilot-analytics-intellij
./gradlew buildPlugin
# To run a sandboxed IDE
./gradlew runIde
```

#### Dashboard
```bash
cd analytics-dashboard
npm install
npm run dev
```

#### Batch Processor
```bash
cd batch-processor
npm install
npm test
```

### Testing

*   **Unit Tests**: Each component has its own test suite.
    *   VS Code: `npm test`
    *   IntelliJ: `./gradlew test`
    *   Dashboard: `npm test`
    *   Batch Processor: `npm test`

*   **Integration**: Use the `batch-processor` e2e flow simulation to verify data processing logic.

### Pull Request Process

1.  Create a feature branch from `main`.
2.  Ensure all tests pass for the component you are modifying.
3.  If you change the database schema, include a migration file in `supabase/migrations`.
4.  Submit a Pull Request with a clear description of your changes.

### Coding Standards

*   **TypeScript**: We use ESLint and Prettier. Run `npm run lint` before committing.
*   **Kotlin**: Follow standard Kotlin coding conventions.
*   **Security**: Never commit secrets. Use environment variables. Ensure all sensitive prompt data is encrypted using the `EncryptionService` before leaving the client.

## License

[MIT](LICENSE)
