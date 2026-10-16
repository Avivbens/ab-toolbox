export function isHttpUrl(url: string): boolean {
  const protocol = URL.parse(url)?.protocol;
  return protocol === 'http:' || protocol === 'https:';
}

export function isMp4(url: string): boolean {
  return new URL(url).pathname.toLowerCase().endsWith('.mp4');
}

export function isMediaUrl(url: string): boolean {
  return /\.(?:m3u8|mp4)$/i.test(new URL(url).pathname);
}

export function stripQuery(url: string): string {
  return url.replace(/[?#].*$/, '');
}
