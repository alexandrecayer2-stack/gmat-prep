// Make inline markdown robust to two malformed patterns seen in some generated
// distractor rationales, so they render cleanly instead of collapsing:
//   1. `\textit{…}` / `\textbf{…}` etc. used OUTSIDE math mode (renders raw).
//   2. an escaped `\$` (currency) placed INSIDE a `$…$` math span — remark-math
//      mis-parses the delimiters, swallowing and space-collapsing nearby text.
// Both are no-ops for well-formed content (plain-text `\$`, math-only `$…$`).

// KaTeX operators we can render as plain Unicode when de-mathing a span.
const MATH_UNICODE: Record<string, string> = {
  '\\times': '×',
  '\\cdot': '·',
  '\\div': '÷',
  '\\pm': '±',
  '\\mp': '∓',
  '\\leq': '≤',
  '\\le': '≤',
  '\\geq': '≥',
  '\\ge': '≥',
  '\\neq': '≠',
  '\\ne': '≠',
  '\\approx': '≈',
  '\\rightarrow': '→',
  '\\to': '→',
  '\\%': '%',
  // NB: `\$` is intentionally left escaped — converting it to a bare `$` would
  // be re-parsed as a math delimiter. Escaped, it renders as a literal dollar.
};

/** Convert the inside of a `$…$` span to plain text (used only for spans that
 *  carry a `\$`, which would otherwise break math parsing). */
function deMath(inner: string): string {
  let s = inner.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
  for (const [cmd, ch] of Object.entries(MATH_UNICODE)) s = s.split(cmd).join(ch);
  return s
    .replace(/[\^_]\{([^{}]*)\}/g, '^$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .trim();
}

export function preprocessMd(md: string): string {
  const unwrapped = md.replace(/\\text(?:it|bf|rm|sf|tt|sl|sc)\{([^{}]*)\}/g, '$1');
  return unwrapped.replace(/\$((?:\\.|[^$\\])*)\$/g, (full, inner: string) =>
    /\\\$/.test(inner) ? deMath(inner) : full,
  );
}
