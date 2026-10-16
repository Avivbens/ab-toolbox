import type { CurlHead } from '../types/curl.types.js';

export function parseHead(block: string): CurlHead {
  const [statusLine = '', ...lines] = block.split(/\r?\n/);
  const headers = new Headers();
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon <= 0) {
      continue;
    }
    try {
      headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
    } catch {
      // skip malformed header lines
    }
  }
  return { status: Number(/^HTTP\/\S+\s+(\d{3})/.exec(statusLine)?.[1] ?? 0), headers };
}

export function expectedSize(status: number, headers: Headers): number | undefined {
  const rangeTotal = /\/(\d+)\s*$/.exec(headers.get('content-range') ?? '')?.[1];
  const length = headers.get('content-length');
  if (status === 206 && rangeTotal) {
    return Number(rangeTotal);
  }
  if (status === 200 && length) {
    return Number(length);
  }
  return undefined;
}
