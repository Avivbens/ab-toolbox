import { GrabError } from './grab.error.js';

/**
 * grabvid could not find or fetch the media itself - the cue to hand the URL to yt-dlp.
 * A direct download that breaks mid-transfer is not one: its .part is resumable, and yt-dlp would adopt it as its own.
 */
export class MediaUnavailableError extends GrabError {
  override name = 'MediaUnavailableError';
}
