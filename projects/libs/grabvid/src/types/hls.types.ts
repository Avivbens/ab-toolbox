import type { Rendition } from '../schemas/rendition.schema.js';

export interface SegmentKey {
  uri: string;
  iv: Buffer | undefined;
}

export interface Segment {
  url: string;
  seq: number;
  key: SegmentKey | undefined;
}

export interface MediaPlaylist {
  url: string;
  text: string;
  variant: Rendition | undefined;
}
