import type { Rendition } from '../schemas/rendition.schema.js';
import { formatBytes } from '../utils/format.util.js';
import { logger } from '../utils/logger.util.js';
import { describeRendition } from '../utils/rendition.util.js';
import { stripQuery } from '../utils/url.util.js';

function sizeLabel({ size, bandwidth }: Omit<Rendition, 'url'>): string {
  if (size !== undefined) {
    return formatBytes(size);
  }
  return bandwidth === undefined ? '' : `${Math.round(bandwidth / 1000)}kbps`;
}

export function renditionRow(rendition: Omit<Rendition, 'url'>, location: string): string {
  return `${describeRendition(rendition).padEnd(8)} ${sizeLabel(rendition).padStart(10)}  ${location}`;
}

/** Keeps the end of the path: sites put the quality suffix (or HLS variant folder) there, which tells rows apart. */
export function pathTail(url: string, width: number): string {
  const tail = new URL(url).pathname.split('/').filter(Boolean).slice(-2).join('/');
  return tail.length > width ? `…${tail.slice(-(width - 1))}` : tail;
}

export function printFormats(kind: string, renditions: readonly Rendition[], preferred: Rendition): void {
  logger.info(`available ${kind} (* = selected by --quality):`);
  for (const rendition of renditions) {
    console.log(`  ${rendition === preferred ? '*' : ' '} ${renditionRow(rendition, stripQuery(rendition.url))}`);
  }
}
