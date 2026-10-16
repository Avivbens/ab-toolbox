import select from '@inquirer/select';
import { interrupted } from '../utils/error.util.js';

type SelectConfig<Value> = Parameters<typeof select<Value>>[0];

const PROMPT_EXIT_ERRORS = new Set(['ExitPromptError', 'AbortPromptError']);

/** Inquirer rejects with its own errors on Ctrl+C or abort; they become the AbortError the rest of the app handles. */
export async function selectPrompt<Value>(config: SelectConfig<Value>, signal: AbortSignal): Promise<Value> {
  try {
    return await select<Value>(config, { signal });
  } catch (err) {
    if (err instanceof Error && PROMPT_EXIT_ERRORS.has(err.name)) {
      throw interrupted();
    }
    throw err;
  }
}
