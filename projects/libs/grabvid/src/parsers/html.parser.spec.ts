import { extractMediaUrls, extractNextPages, pageTitle } from './html.parser.js';
import { PACKED_PLAYER } from './packed-player.fixture.js';

const BASE = 'https://site.example/watch/1';

describe('pageTitle', () => {
  it('prefers og:title over <title> and decodes entities', () => {
    const html = `<title>Clip - Site</title><meta property="og:title" content="Tom &amp; Jerry&#39;s &#x263A;">`;
    expect(pageTitle(html)).toBe("Tom & Jerry's ☺");
  });

  it('reads og:title when content comes before the property', () => {
    expect(pageTitle(`<meta content='Reversed' name="twitter:title">`)).toBe('Reversed');
  });

  it('falls back to <title> and collapses whitespace', () => {
    expect(pageTitle('<title>\n  Some   Clip \n</title>')).toBe('Some Clip');
  });

  it('returns undefined without a title', () => {
    expect(pageTitle('<title>  </title>')).toBeUndefined();
  });
});

describe('extractMediaUrls', () => {
  it('prefers HLS over mp4 and de-duplicates', () => {
    const html = `
      <video src="https://cdn.example/v/720p.mp4"></video>
      <script>var a = "https:\\/\\/cdn.example\\/hls\\/master.m3u8?t=1\\u0026e=2";</script>
      <script>var b = "https://cdn.example/hls/master.m3u8?t=1&e=2";</script>`;
    expect(extractMediaUrls(html, BASE)).toEqual(['https://cdn.example/hls/master.m3u8?t=1&e=2']);
  });

  it('resolves relative player sources against the page', () => {
    const html = `jwplayer().setup({ file: "/media/clip_1080p.mp4" });`;
    expect(extractMediaUrls(html, BASE)).toEqual(['https://site.example/media/clip_1080p.mp4']);
  });

  it('finds media inside packed JS', () => {
    expect(extractMediaUrls(`<script>${PACKED_PLAYER}</script>`, BASE)).toEqual(['https://cdn.example/master.m3u8']);
  });

  it('keeps a playlist that lives under a .mp4 path segment', () => {
    const html = `{"videoUrl":"https:\\/\\/cdn.example\\/hls\\/v\\/clip_720P_4000K.mp4\\/master.m3u8?h=abc%3D&e=1&f=1","quality":"720"}`;
    expect(extractMediaUrls(html, BASE)).toEqual([
      'https://cdn.example/hls/v/clip_720P_4000K.mp4/master.m3u8?h=abc%3D&e=1&f=1',
    ]);
  });

  it('skips URLs whose path only passes through a media file, like thumbnail transforms', () => {
    const html = `
      <img src="https://pix.example/v/original_1.mp4/plain/rs:fit:320:180/vts:728?hdnea=st=1~hmac=2">
      <video src="https://cdn.example/v/clip_480p.mp4?token=1"></video>`;
    expect(extractMediaUrls(html, BASE)).toEqual(['https://cdn.example/v/clip_480p.mp4?token=1']);
  });

  it('stops an unquoted URL at the extension when punctuation follows', () => {
    expect(extractMediaUrls('<p>mirror: https://cdn.example/v/clip.mp4, enjoy</p>', BASE)).toEqual([
      'https://cdn.example/v/clip.mp4',
    ]);
  });

  it('returns nothing when the page has no media', () => {
    expect(extractMediaUrls('<p>hello</p>', BASE)).toEqual([]);
  });
});

describe('extractNextPages', () => {
  it('follows iframes, meta refreshes and JS redirects, resolved against the page', () => {
    const html = `
      <iframe src="/embed/1"></iframe>
      <meta http-equiv="refresh" content="0; url=https://player.example/r">
      <script>window.location.href = "https:\\/\\/player.example\\/js";</script>
      <script>location.replace('/replaced')</script>`;
    expect(extractNextPages(html, BASE)).toEqual([
      'https://site.example/embed/1',
      'https://player.example/r',
      'https://player.example/js',
      'https://site.example/replaced',
    ]);
  });

  it('drops targets that are not http(s)', () => {
    expect(extractNextPages(`<iframe src="about:blank"></iframe><iframe src='javascript:void(0)'>`, BASE)).toEqual([]);
  });
});
