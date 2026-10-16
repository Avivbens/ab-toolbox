import type { Rendition } from '../schemas/rendition.schema.js';
import { describeRendition } from '../utils/rendition.util.js';
import { renditionRow } from './formats-list.view.js';
import { selectPrompt } from './select-prompt.view.js';

/** `locate` fills the last column, which is what tells otherwise identical rows apart (a path tail, a format id). */
export async function pickQuality<T extends Omit<Rendition, 'url'>>(
  items: readonly T[],
  preferred: T,
  locate: (item: T, width: number) => string,
  signal: AbortSignal,
): Promise<T> {
  const width = Math.max(16, (process.stdout.columns || 80) - 40);
  return selectPrompt<T>(
    {
      message: 'Pick a quality',
      choices: items.map((item) => ({
        value: item,
        name: renditionRow(item, locate(item, width)),
        short: describeRendition(item),
      })),
      default: preferred,
      pageSize: Math.min(items.length, 15),
      theme: { indexMode: 'number', keybindings: ['vim'] },
    },
    signal,
  );
}
