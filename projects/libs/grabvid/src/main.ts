#!/usr/bin/env node
import { parseCliArgs } from './cli/parse-cli-args.js';
import { GrabError } from './errors/grab.error.js';
import { grab } from './services/grab.service.js';
import { isAbortError } from './utils/error.util.js';
import { logger } from './utils/logger.util.js';
import { requireTools } from './utils/require-tools.util.js';

async function main(signal: AbortSignal): Promise<void> {
  const options = await parseCliArgs(process.argv);
  if (options.interactive && !(process.stdin.isTTY && process.stdout.isTTY)) {
    throw new GrabError('--interactive needs a terminal');
  }
  await requireTools(['curl', 'ffmpeg']);
  await grab(options, { ua: options.ua, signal });
}

const controller = new AbortController();
/** Ctrl+C reaches curl and ffmpeg too; aborting lets cleanup run, and a second Ctrl+C force-quits. */
process.once('SIGINT', () => {
  controller.abort();
});

try {
  await main(controller.signal);
} catch (err) {
  if (controller.signal.aborted || isAbortError(err)) {
    logger.warn('interrupted');
    process.exitCode = 130;
  } else {
    if (err instanceof GrabError) {
      logger.error(err.message);
    } else {
      console.error(err);
    }
    process.exitCode = 1;
  }
  // stop any parallel downloads still in flight so the process can exit
  controller.abort();
}
