import { z } from 'zod';
import { heightFromText } from '../utils/rendition.util.js';

export const qualitySchema = z.string().transform((raw, ctx): 'best' | 'worst' | number => {
  if (raw === 'best' || raw === 'worst') {
    return raw;
  }
  const height = /^\d{3,4}$/.test(raw) ? Number(raw) : heightFromText(raw);
  if (height === undefined) {
    ctx.addIssue({ code: 'custom', message: `must be best, worst or a height like 720 / 1080p / 4k, got "${raw}"` });
    return z.NEVER;
  }
  return height;
});

export type Quality = z.infer<typeof qualitySchema>;
