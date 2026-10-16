import vm from 'node:vm';

const PACKER_MARKER = 'eval(function(p,a,c,k,e,d)';
const UNPACK_TIMEOUT_MS = 2000;

function closingParen(source: string, open: number): number {
  let depth = 0;
  let quote: string | undefined;
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = undefined;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
    } else if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function* packedBlocks(html: string): Generator<string> {
  let start = html.indexOf(PACKER_MARKER);
  while (start !== -1) {
    const end = closingParen(html, start + 'eval'.length);
    if (end !== -1) {
      yield html.slice(start, end + 1);
    }
    start = html.indexOf(PACKER_MARKER, end === -1 ? start + PACKER_MARKER.length : end + 1);
  }
}

/**
 * Runs each Dean Edwards packer with `eval` shadowed, so it hands back its source instead of executing it.
 * vm keeps the page's JS away from require/process and bounds it with a timeout - it is not a
 * hard sandbox, but the payload itself never runs.
 */
export function unpackJs(html: string): string {
  const sources: string[] = [];
  for (const block of packedBlocks(html)) {
    try {
      const captured: unknown = vm.runInNewContext(
        `var out = []; (function (eval) {\n${block}\n})(function (s) { out.push(String(s)); return ''; }); out;`,
        Object.create(null),
        { timeout: UNPACK_TIMEOUT_MS },
      );
      if (Array.isArray(captured)) {
        sources.push(...captured.map(String));
      }
    } catch {
      // not a packer we can run - skip it
    }
  }
  return sources.join('\n');
}
