const BYTE_UNITS = ['KiB', 'MiB', 'GiB', 'TiB'];

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 'B';
  for (const next of BYTE_UNITS) {
    if (value < 1024) {
      break;
    }
    value /= 1024;
    unit = next;
  }
  return `${value.toFixed(2)}${unit}`;
}

export function formatSpeed(bytesPerSecond: number | undefined): string {
  return bytesPerSecond === undefined ? 'Unknown B/s' : `${formatBytes(bytesPerSecond).padStart(10)}/s`;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
