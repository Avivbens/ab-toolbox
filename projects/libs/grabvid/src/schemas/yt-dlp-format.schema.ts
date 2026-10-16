import { z } from 'zod';

/** The part of a yt-dlp `-J` format entry grabvid reads; yt-dlp reports unknown values as null. */
export const ytDlpFormatSchema = z.object({
  format_id: z.string(),
  ext: z.string().nullish(),
  height: z.number().nullish(),
  tbr: z.number().nullish(),
  filesize: z.number().nullish(),
  filesize_approx: z.number().nullish(),
  vcodec: z.string().nullish(),
  acodec: z.string().nullish(),
});

export type YtDlpFormat = z.infer<typeof ytDlpFormatSchema>;
