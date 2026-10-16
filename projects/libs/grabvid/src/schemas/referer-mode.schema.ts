import { z } from 'zod';
import { isHttpUrl } from '../utils/url.util.js';

/** `auto` probes for a Referer the CDN accepts, `none` sends no Referer, anything else is sent as-is. */
export const refererModeSchema = z.string().refine((mode) => mode === 'auto' || mode === 'none' || isHttpUrl(mode), {
  error: (issue) => `must be auto, none or an http(s) URL, got "${issue.input}"`,
});
