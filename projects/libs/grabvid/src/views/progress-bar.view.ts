import type { ProgressSnapshot } from '../types/download.types.js';
import { formatBytes, formatDuration, formatSpeed } from '../utils/format.util.js';

const SPEED_WINDOW_MS = 3000;

/** Redraws one line in place on a TTY; when piped, prints a fresh line every couple of seconds instead. */
export class ProgressBar {
  readonly #tty = Boolean(process.stdout.isTTY);
  readonly #renderEveryMs = this.#tty ? 100 : 2000;
  readonly #startedAt = performance.now();
  readonly #baseline: number;
  #samples: Array<{ at: number; done: number }>;
  #snapshot: ProgressSnapshot;
  #renderedAt = Number.NEGATIVE_INFINITY;
  #lineOpen = false;

  constructor(baseline = 0) {
    this.#baseline = baseline;
    this.#samples = [{ at: this.#startedAt, done: baseline }];
    this.#snapshot = { done: baseline, total: undefined };
  }

  update(snapshot: ProgressSnapshot): void {
    const now = performance.now();
    this.#snapshot = snapshot;
    this.#samples.push({ at: now, done: snapshot.done });
    const cutoff = now - SPEED_WINDOW_MS;
    while (this.#samples.length > 2 && (this.#samples[0]?.at ?? now) < cutoff) {
      this.#samples.shift();
    }
    if (now - this.#renderedAt >= this.#renderEveryMs) {
      this.#renderedAt = now;
      this.#write(this.#progressLine(), false);
    }
  }

  finish(): void {
    const { done } = this.#snapshot;
    const seconds = (performance.now() - this.#startedAt) / 1000;
    const speed = seconds > 0 ? (done - this.#baseline) / seconds : undefined;
    this.#write(
      `[download] 100% of ${formatBytes(done).padStart(10)} in ${formatDuration(seconds)} at ${formatSpeed(speed)}`,
      true,
    );
  }

  close(): void {
    if (this.#lineOpen) {
      process.stdout.write('\n');
      this.#lineOpen = false;
    }
  }

  #speed(): number | undefined {
    const first = this.#samples[0];
    const last = this.#samples.at(-1);
    if (!first || !last || last.at <= first.at) {
      return undefined;
    }
    return ((last.done - first.done) * 1000) / (last.at - first.at);
  }

  #progressLine(): string {
    const { done, total, estimated, fragment } = this.#snapshot;
    const speed = this.#speed();
    const fragmentInfo = fragment ? ` (frag ${fragment.done}/${fragment.total})` : '';
    if (!total) {
      const elapsed = formatDuration((performance.now() - this.#startedAt) / 1000);
      return `[download] ${formatBytes(done).padStart(10)} at ${formatSpeed(speed)} (${elapsed})${fragmentInfo}`;
    }
    const percent = Math.min(100, (done / total) * 100);
    const eta = speed ? formatDuration(Math.max(0, total - done) / speed) : 'Unknown';
    const size = `${estimated ? '~' : ''}${formatBytes(total).padStart(10)}`;
    return `[download] ${percent.toFixed(1).padStart(5)}% of ${size} at ${formatSpeed(speed)} ETA ${eta}${fragmentInfo}`;
  }

  #write(line: string, final: boolean): void {
    if (this.#tty) {
      process.stdout.write(`\r${line}\x1b[K${final ? '\n' : ''}`);
      this.#lineOpen = !final;
    } else {
      process.stdout.write(`${line}\n`);
    }
  }
}
