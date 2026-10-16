import { hideBin } from 'yargs/helpers';
import { GrabError } from '../errors/grab.error.js';
import { type GrabOptions, grabOptionsSchema } from '../schemas/grab-options.schema.js';
import { createCli } from './cli.definition.js';

/** Names a schema issue after the flag the user typed, e.g. `maxSegments` → `--max-segments`. */
function flagOf(key: PropertyKey | undefined): string | undefined {
  if (key === 'url') {
    return '<url>';
  }
  return typeof key === 'string' ? `--${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}` : undefined;
}

export async function parseCliArgs(argv: string[]): Promise<GrabOptions> {
  const cli = createCli(hideBin(argv));
  const parsed = grabOptionsSchema.safeParse(await cli.parseAsync());
  if (parsed.success) {
    return parsed.data;
  }

  cli.showHelp((help) => console.error(`${help}\n`));
  const problems = parsed.error.issues.map((issue) => {
    const flag = flagOf(issue.path[0]);
    return flag ? `${flag} ${issue.message}` : issue.message;
  });
  throw new GrabError(problems.join('\n    '));
}
