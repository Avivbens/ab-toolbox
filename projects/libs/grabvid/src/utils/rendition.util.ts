import { MediaUnavailableError } from '../errors/media-unavailable.error.js';
import type { Quality } from '../schemas/quality.schema.js';
import type { Rendition, RenditionQuality } from '../schemas/rendition.schema.js';

const K_HEIGHTS: Readonly<Record<string, number>> = { '2': 1440, '4': 2160, '8': 4320 };

export function heightFromText(label: string): number | undefined {
  const lower = label.toLowerCase();
  const pixels = /(?:^|[^a-z0-9])(\d{3,4})p(?![a-z])/.exec(lower)?.[1];
  if (pixels) {
    return Number(pixels);
  }
  const k = /(?:^|[^a-z0-9])([248])k(?![a-z0-9])/.exec(lower)?.[1];
  return k ? K_HEIGHTS[k] : undefined;
}

function compareRenditions(a: RenditionQuality, b: RenditionQuality): number {
  return (a.height ?? 0) - (b.height ?? 0) || (a.bandwidth ?? 0) - (b.bandwidth ?? 0);
}

/** Ties keep the earliest rendition, i.e. the one the page / playlist lists first. */
function extreme<T extends RenditionQuality>(renditions: readonly T[], direction: 1 | -1): T | undefined {
  return renditions.reduce<T | undefined>(
    (kept, candidate) => (kept === undefined || compareRenditions(candidate, kept) * direction > 0 ? candidate : kept),
    undefined,
  );
}

/** A height cap picks the best rendition at or under it, falling back to the smallest one available. */
export function chooseRendition<T extends RenditionQuality>(renditions: readonly T[], quality: Quality): T | undefined {
  if (quality === 'best') {
    return extreme(renditions, 1);
  }
  if (quality === 'worst') {
    return extreme(renditions, -1);
  }
  const fitting = renditions.filter((r) => r.height !== undefined && r.height <= quality);
  return fitting.length > 0 ? extreme(fitting, 1) : extreme(renditions, -1);
}

export function preferredRendition(renditions: readonly Rendition[], quality: Quality): Rendition {
  const preferred = chooseRendition(renditions, quality);
  if (!preferred) {
    throw new MediaUnavailableError('no media candidates found');
  }
  return preferred;
}

export function qualityLabel({ height, bandwidth }: RenditionQuality): string | undefined {
  if (height !== undefined) {
    return `${height}p`;
  }
  return bandwidth === undefined ? undefined : `${Math.round(bandwidth / 1000)}kbps`;
}

export function describeRendition(rendition: RenditionQuality): string {
  return qualityLabel(rendition) ?? 'unknown';
}
