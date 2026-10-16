import { isHttpUrl, isMediaUrl, isMp4 } from '../utils/url.util.js';
import { unpackJs } from './packed-js.parser.js';

const HTML_ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** og:title first: `<title>` usually carries a site suffix. */
const TITLE_PATTERNS = [
  /<meta\s[^>]*?(?:property|name)=["'](?:og|twitter):title["'][^>]*?\scontent=(?<q>["'])(?<title>.*?)\k<q>/i,
  /<meta\b[^>]*?\scontent=(?<q>["'])(?<title>.*?)\k<q>[^>]*?(?:property|name)=["'](?:og|twitter):title["']/i,
  /<title[^>]*>(?<title>[^<]*)<\/title>/i,
];

/** Runs past the first extension when the URL goes on (`clip.mp4/master.m3u8?…`); `extractMediaUrls` then keeps only real media paths. */
const MEDIA_RE = /https?:\/\/[^\s"'\\<>()]+?\.(?:m3u8|mp4)(?:[/?#][^\s"'\\<>()]*)?/gi;
const SRC_RE = /(?:file|src|source)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)/gi;
const IFRAME_RE = /<iframe[^>]+src=["']?([^"'\s>]+)/gi;
/** Players often hop via a meta-refresh or a JS location assignment rather than an iframe. */
const REDIRECT_RE =
  /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"'\s>]+)|(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']|location\.replace\(\s*["']([^"']+)["']\s*\)/gi;

export function deobfuscate(source: string): string {
  return source.replaceAll('\\/', '/').replaceAll('\\u0026', '&').replaceAll('&amp;', '&');
}

export function decodeEntities(source: string): string {
  return source.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (!body.startsWith('#')) {
      return HTML_ENTITIES[body.toLowerCase()] ?? entity;
    }
    const code = /^#x/i.test(body) ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

export function pageTitle(html: string): string | undefined {
  for (const pattern of TITLE_PATTERNS) {
    const title = decodeEntities(pattern.exec(html)?.groups?.title ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    if (title) {
      return title;
    }
  }
  return undefined;
}

/** HLS wins over mp4 when a page carries both: a master playlist exposes every quality. */
export function extractMediaUrls(html: string, base: string): string[] {
  const source = `${deobfuscate(html)}\n${deobfuscate(unpackJs(html))}`;
  const hits = [
    ...Array.from(source.matchAll(MEDIA_RE), (m) => m[0]),
    ...Array.from(source.matchAll(SRC_RE), (m) => deobfuscate(m[1] ?? '')),
  ];
  const media = [...new Set(hits.flatMap((hit) => URL.parse(hit, base)?.href ?? []))].filter(isMediaUrl);
  const hls = media.filter((url) => !isMp4(url));
  return hls.length > 0 ? hls : media;
}

export function extractNextPages(html: string, base: string): string[] {
  const links = [
    ...Array.from(html.matchAll(IFRAME_RE), (m) => m[1]),
    ...Array.from(html.matchAll(REDIRECT_RE), (m) => m[1] ?? m[2] ?? m[3]),
  ];
  return links.flatMap((link) => {
    const target = link === undefined ? undefined : URL.parse(deobfuscate(link), base)?.href;
    return target && isHttpUrl(target) ? [target] : [];
  });
}
