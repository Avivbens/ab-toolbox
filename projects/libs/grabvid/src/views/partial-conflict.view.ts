import { GrabError } from '../errors/grab.error.js';
import type { PartialSource } from '../schemas/partial-source.schema.js';
import type { PartialChoice } from '../types/download.types.js';
import { formatBytes } from '../utils/format.util.js';
import { logger } from '../utils/logger.util.js';
import { describeRendition } from '../utils/rendition.util.js';
import { selectPrompt } from './select-prompt.view.js';

interface PartialConflict {
  part: string;
  offset: number;
  stored: PartialSource | undefined;
  selected: PartialSource;
  canResume: boolean;
}

function sourceLine(source: PartialSource): string {
  return `${describeRendition(source).padStart(7)}  ${source.url}`;
}

export async function askAboutPartial(
  { part, offset, stored, selected, canResume }: PartialConflict,
  signal: AbortSignal,
): Promise<PartialChoice> {
  const progress = stored?.total ? `${formatBytes(offset)} of ${formatBytes(stored.total)}` : formatBytes(offset);
  const report = [
    `${part} does not match the selected download:`,
    `      partial  ${stored ? sourceLine(stored) : 'unknown origin (no record of what it holds)'}  (${progress})`,
    `      selected ${sourceLine(selected)}${selected.total ? `  (${formatBytes(selected.total)})` : ''}`,
  ].join('\n');
  if (!process.stdin.isTTY) {
    throw new GrabError(
      `${report}\n    Not a terminal, so not asking: rerun with the original quality, or delete the .part to start over.`,
    );
  }

  logger.warn(report);
  const choice = await selectPrompt<PartialChoice | 'quit'>(
    {
      message: 'What should happen to the partial download?',
      choices: [
        { value: 'restart', name: `Restart with ${describeRendition(selected)} (discards the partial)` },
        ...(canResume && stored
          ? [{ value: 'resume' as const, name: `Resume the partial at ${describeRendition(stored)}` }]
          : []),
        { value: 'quit', name: 'Quit and leave the partial untouched' },
      ],
      default: 'quit',
    },
    signal,
  );
  if (choice === 'quit') {
    throw new GrabError(`stopped - ${part} left untouched`);
  }
  return choice;
}
