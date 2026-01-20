import { handleBeforeSubmitPrompt } from './handlers/beforeSubmitPrompt';
import { handleAfterMCPExecution } from './handlers/afterMCPExecution';
import { handleAfterFileEdit } from './handlers/afterFileEdit';
import { handleSessionEnd } from './handlers/sessionEnd';
import * as dotenv from 'dotenv';

// Load environment variables from .env file if it exists
dotenv.config();

const hookType = process.argv[2];

// Read JSON input from stdin
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });

process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(inputData);
    let output: object;

    switch (hookType) {
      case 'beforeSubmitPrompt':
        output = await handleBeforeSubmitPrompt(input);
        break;
      case 'afterMCPExecution':
        output = await handleAfterMCPExecution(input);
        break;
      case 'afterFileEdit':
        output = await handleAfterFileEdit(input);
        break;
      case 'sessionEnd':
        output = await handleSessionEnd(input);
        break;
      default:
        output = {};
    }

    // Write JSON output to stdout
    process.stdout.write(JSON.stringify(output));
  } catch (error) {
    console.error('Error in hook handler:', error);
    process.exit(1);
  }
});
