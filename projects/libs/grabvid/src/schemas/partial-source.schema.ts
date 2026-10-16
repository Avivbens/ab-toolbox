import { z } from 'zod';
import { renditionSchema } from './rendition.schema.js';

/** What a `.part` file holds, stored in its `.part.json` sidecar. */
export const partialSourceSchema = renditionSchema
  .pick({ url: true, height: true })
  .extend({ total: z.number().optional() });

export type PartialSource = z.infer<typeof partialSourceSchema>;
