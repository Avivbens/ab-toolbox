import type { GrabOptions } from '../schemas/grab-options.schema.js';

export type GrabContext = Readonly<Pick<GrabOptions, 'ua'> & { signal: AbortSignal }>;
