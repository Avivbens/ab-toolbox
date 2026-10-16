import { z } from 'zod';
import { qualitySchema } from './quality.schema.js';
import { refererModeSchema } from './referer-mode.schema.js';

export const grabOptionsSchema = z.object({
  url: z.url(),
  quality: qualitySchema,
  /** Defaulted here, not in yargs: a yargs default would make `.conflicts()` fire on every run. */
  interactive: z.boolean().default(false),
  listFormats: z.boolean().default(false),
  output: z.string().min(1, { error: 'must not be empty' }).optional(),
  referer: refererModeSchema,
  jobs: z.int({ error: 'must be an integer' }).min(1, { error: 'must be at least 1' }),
  maxSegments: z.int({ error: 'must be an integer' }).min(0, { error: 'must be 0 or more' }),
  ua: z.string().min(1, { error: 'must not be empty' }),
  fallback: z.boolean(),
});

export type GrabOptions = z.infer<typeof grabOptionsSchema>;
