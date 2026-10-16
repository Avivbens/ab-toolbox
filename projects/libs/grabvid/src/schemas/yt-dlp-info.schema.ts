import { z } from 'zod';
import { ytDlpFormatSchema } from './yt-dlp-format.schema.js';

export const ytDlpInfoSchema = z.object({
  title: z.string().nullish(),
  formats: z.array(ytDlpFormatSchema).nullish(),
});

export type YtDlpInfo = z.infer<typeof ytDlpInfoSchema>;
