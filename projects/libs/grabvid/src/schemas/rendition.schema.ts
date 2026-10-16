import { z } from 'zod';

export const renditionSchema = z.object({
  url: z.string(),
  height: z.number().optional(),
  bandwidth: z.number().optional(),
  /** Bytes, looked up only when a listing or the picker will show it. */
  size: z.number().optional(),
});

export type Rendition = z.infer<typeof renditionSchema>;

export type RenditionQuality = Partial<Pick<Rendition, 'height' | 'bandwidth'>>;
