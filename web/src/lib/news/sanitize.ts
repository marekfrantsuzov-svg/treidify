/**
 * Turns publisher feed text (which can carry HTML, inline CSS, scripts and Microsoft Word markup) into plain,
 * readable text. The output is rendered by React as text, never as HTML, so nothing in a feed can execute or style
 * the page. Paragraph breaks survive as "\n\n"; everything else that is not prose is removed.
 */
const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", bull: "•", middot: "·", euro: "€", pound: "£", yen: "¥", cent: "¢", copy: "©", reg: "®", trade: "™",
  deg: "°", times: "×", divide: "÷", plusmn: "±", frac12: "½", frac14: "¼", frac34: "¾", laquo: "«", raquo: "»", shy: "",
  zwj: "", zwnj: "", lrm: "", rlm: "", ensp: " ", emsp: " ", thinsp: " ", sect: "§", para: "¶", percnt: "%",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "";
    }
    const v = NAMED[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}

const BLOCK = /<\/?(p|div|br|li|ul|ol|h[1-6]|blockquote|tr|table|section|article|header|footer|figure|figcaption|pre)\b[^>]*>/gi;

export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);
  // Entity-encoded markup ("&lt;p&gt;") is decoded once first so it is stripped like real markup.
  if (/&lt;\/?[a-z!]/i.test(s)) s = s.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
  s = s
    .replace(/<!--[\s\S]*?-->/g, " ")                                  // comments, incl. Word's <!--[if gte mso 9]>
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, " ")
    .replace(/<(script|style|xml|head|noscript|iframe|object|svg|template|title|w:[a-z]+|o:[a-z]+)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<(script|style|iframe|object)\b[\s\S]*$/gi, " ")         // unterminated dangerous blocks
    .replace(BLOCK, "\n")
    .replace(/<\/?[a-z][^>]*>/gi, "")                                  // every other tag
    .replace(/<![^>]*>/g, "")
    .replace(/<[^>]*$/g, "");                                          // a tag cut off at the end of the summary
  s = decodeEntities(s);
  s = s
    .replace(/\/\*[\s\S]*?\*\//g, " ")                                 // CSS comments
    .replace(/(^|[\s}])(@[a-z-]+[^{]*)?[^{}\n]{0,300}\{[^{}]*\b[a-z-]+\s*:[^{}]*\}/gi, "$1") // CSS rules: selector { prop: value }
    .replace(/\b(mso-[a-z-]+|font-family|font-size|margin(-[a-z]+)?|line-height|text-align|page|color)\s*:\s*[^;\n]{0,80};/gi, " ")
    .replace(/\bNormal\s+\d+(\s+(false|true))+(\s+([A-Z]{2}-[A-Z]{2}|X-NONE|[A-Z]{2}))*/g, " ") // Word "Normal 0 false false false EN-US X-NONE"
    .replace(/\b(MicrosoftInternetExplorer4|DocumentNotSpecified|Clean Clean|Table Normal)\b/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​﻿]/g, "");
  return s
    .split(/\n\s*\n|\n/)
    .map((p) => p.replace(/[ \t ]+/g, " ").trim())
    .filter((p) => p.length > 0 && /[\p{L}\p{N}]/u.test(p))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** One line (headlines, sources). */
export const cleanLine = (s: string | null | undefined) => cleanText(s).replace(/\s*\n+\s*/g, " ");

/** Paragraphs for display. */
export const paragraphs = (s: string) => s.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
