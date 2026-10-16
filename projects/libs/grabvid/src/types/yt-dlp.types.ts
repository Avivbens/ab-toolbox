import type { Rendition } from '../schemas/rendition.schema.js';
import type { YtDlpFormat } from '../schemas/yt-dlp-format.schema.js';

/** A yt-dlp format in the shape grabvid's selection rules and quality picker work with. */
export type YtDlpRendition = Omit<Rendition, 'url'> & { format: YtDlpFormat; hasAudio: boolean };
