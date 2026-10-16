import { ytDlpInfoSchema } from './yt-dlp-info.schema.js';

describe('ytDlpInfoSchema', () => {
  it('keeps the format fields grabvid reads, accepting nulls and dropping the rest', () => {
    const info = ytDlpInfoSchema.parse({
      id: 'abc',
      title: 'Clip',
      formats: [
        { format_id: 'hls-720', ext: 'mp4', height: 720, tbr: null, vcodec: 'avc1', acodec: 'none', url: 'https://x' },
        { format_id: 'audio', vcodec: 'none', acodec: 'mp4a.40.2', height: null },
      ],
    });

    expect(info.title).toBe('Clip');
    expect(info.formats).toEqual([
      { format_id: 'hls-720', ext: 'mp4', height: 720, tbr: null, vcodec: 'avc1', acodec: 'none' },
      { format_id: 'audio', vcodec: 'none', acodec: 'mp4a.40.2', height: null },
    ]);
  });

  it('allows a result without formats, like a playlist', () => {
    expect(ytDlpInfoSchema.parse({ _type: 'playlist', title: 'List' }).formats).toBeUndefined();
  });

  it('rejects a format without an id', () => {
    expect(ytDlpInfoSchema.safeParse({ formats: [{ height: 720 }] }).success).toBe(false);
  });
});
