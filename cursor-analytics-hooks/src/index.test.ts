
import { spawn } from 'child_process';
import path from 'path';

const SCRIPT_PATH = path.join(__dirname, 'index.ts');

function runHook(hookType: string, input: object): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use ts-node to run the script directly for testing
    // Inject dummy Supabase credentials
    const env = {
        ...process.env,
        SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_ANON_KEY: 'dummy-key',
        ENCRYPTION_KEY: '1234567890123456789012345678901234567890123456789012345678901234'
    };

    const child = spawn('npx', ['ts-node', SCRIPT_PATH, hookType], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });

    let outputData = '';
    let errorData = '';

    child.stdout.on('data', (chunk) => {
      outputData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      errorData += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${errorData}`));
      } else {
        // Strip non-JSON noise (like dotenv logs)
        const lines = outputData.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        resolve(lastLine);
      }
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

describe('Cursor Hooks CLI', () => {
    // Increase timeout for spawning processes
    jest.setTimeout(30000);

    test('should handle unknown hook type gracefully (return empty object)', async () => {
        const result = await runHook('unknownHook', { foo: 'bar' });
        try {
            expect(JSON.parse(result)).toEqual({});
        } catch (e) {
            console.error('Failed to parse output:', result);
            throw e;
        }
    });

    // Note: We are not mocking the handlers here, so this is an integration test.
    // However, since we are running via child_process, mocking is harder.
    // For a unit test of index.ts logic, we would need to export the main logic or mock process.stdin.
});
