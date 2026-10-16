import { MediaUnavailableError } from '../errors/media-unavailable.error.js';
import type { Rendition } from '../schemas/rendition.schema.js';
import type { Segment, SegmentKey } from '../types/hls.types.js';

function numberAttr(line: string, pattern: RegExp): number | undefined {
  const match = pattern.exec(line)?.[1];
  return match === undefined ? undefined : Number(match);
}

export function parseMasterPlaylist(playlist: string, base: string): Rendition[] {
  const renditions: Rendition[] = [];
  let pending: Omit<Rendition, 'url'> | undefined;
  for (const rawLine of playlist.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      pending = {
        height: numberAttr(line, /RESOLUTION=\d+x(\d+)/),
        bandwidth: numberAttr(line, /[:,]BANDWIDTH=(\d+)/),
        size: undefined,
      };
    } else if (pending && line && !line.startsWith('#')) {
      renditions.push({ url: new URL(line, base).href, ...pending });
      pending = undefined;
    }
  }
  return renditions;
}

function parseKey(line: string, base: string): SegmentKey | undefined {
  const method = /METHOD=([^,]+)/.exec(line)?.[1];
  const uri = /URI="([^"]+)"/.exec(line)?.[1];
  if (!method || method === 'NONE' || !uri) {
    return undefined;
  }
  if (method !== 'AES-128') {
    throw new MediaUnavailableError(`unsupported HLS encryption: ${method}`);
  }
  const iv = /IV=0x([0-9a-f]+)/i.exec(line)?.[1];
  return { uri: new URL(uri, base).href, iv: iv ? Buffer.from(iv.padStart(32, '0'), 'hex') : undefined };
}

export function parseMediaPlaylist(
  playlist: string,
  base: string,
): { segments: Segment[]; initUrl: string | undefined } {
  const segments: Segment[] = [];
  let seq = numberAttr(playlist, /#EXT-X-MEDIA-SEQUENCE:(\d+)/) ?? 0;
  let key: SegmentKey | undefined;
  let initUrl: string | undefined;
  for (const rawLine of playlist.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('#EXT-X-KEY')) {
      key = parseKey(line, base);
    } else if (line.startsWith('#EXT-X-MAP')) {
      const uri = /URI="([^"]+)"/.exec(line)?.[1];
      if (uri) {
        initUrl = new URL(uri, base).href;
      }
    } else if (line && !line.startsWith('#')) {
      segments.push({ url: new URL(line, base).href, seq, key });
      seq += 1;
    }
  }
  return { segments, initUrl };
}
