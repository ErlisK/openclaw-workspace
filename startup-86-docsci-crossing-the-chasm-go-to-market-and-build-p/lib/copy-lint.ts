/**
 * lib/copy-lint.ts
 *
 * Copy quality linter for Markdown documentation.
 * All pattern arrays are defined inside the lintCopy() function body
 * to avoid module-level variable name collisions with webpack minifier.
 *
 * Checks:
 *   1. PASSIVE VOICE
 *   2. READING GRADE (Flesch-Kincaid)
 *   3. SENTENCE LENGTH (> 35 words)
 *   4. SENSITIVE TERMS
 *   5. WEASEL WORDS
 *   6. HEDGING phrases
 *   7. UNEXPANDED ACRONYMS
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type CopyFindingType =
  | "passive_voice"
  | "reading_grade"
  | "sentence_too_long"
  | "sensitive_term"
  | "weasel_word"
  | "hedging"
  | "unexpanded_acronym";

export type CopySeverity = "error" | "warning" | "info";

export interface CopyFinding {
  type: CopyFindingType;
  severity: CopySeverity;
  line: number;
  column?: number;
  text: string;
  message: string;
  suggestion: string;
}

export interface ReadingStats {
  words: number;
  sentences: number;
  syllables: number;
  avgWordsPerSentence: number;
  fleschKincaidGrade: number;
  fleschReadingEase: number;
}

export interface CopyLintReport {
  findings: CopyFinding[];
  stats: ReadingStats;
  ranAt: string;
}

// ── Syllable counting ────────────────────────────────────────────────────

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[aeiouy]$)/, "");
  const matches = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, matches ? matches.length : 1);
}

function computeStats(text: string): ReadingStats {
  const plain = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, " ")
    .replace(/[*_~]{1,3}/g, " ")
    .replace(/\|.*?\|/g, " ")
    .replace(/^\s*[-*+]\s+/gm, " ")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = plain.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0);
  const words = plain.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const S = sentences.length || 1;
  const W = words.length || 1;
  const Syl = syllables || 1;

  return {
    words: W,
    sentences: S,
    syllables: Syl,
    avgWordsPerSentence: Math.round((W / S) * 10) / 10,
    fleschKincaidGrade: Math.round((0.39 * (W / S) + 11.8 * (Syl / W) - 15.59) * 10) / 10,
    fleschReadingEase: Math.round((206.835 - 1.015 * (W / S) - 84.6 * (Syl / W)) * 10) / 10,
  };
}

// ── Acronym detection ─────────────────────────────────────────────────────

function findUnexpandedAcronyms(text: string): Array<{ acronym: string; line: number }> {
  const results: Array<{ acronym: string; line: number }> = [];
  const seen = new Map<string, number>();
  const expanded = new Set<string>();
  const skipList = ["HTTP","HTTPS","JSON","API","URL","HTML","CSS","JS","TS","SQL","CI","CD","VCS","PR","UI","UX","CLI","SDK","LLM","AI","ML","ID","OK","NO","NOTE","WARNING","TODO","FIXME","EOF","EOL","CR","LF","NaN","NULL","TRUE","FALSE","GET","POST","PUT","DELETE","PATCH"];

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let expMatch: RegExpExecArray | null;
    const expPat = /\b([A-Z][A-Za-z\s]+)\s+\(([A-Z]{2,6})\)/g;
    while ((expMatch = expPat.exec(line)) !== null) {
      expanded.add(expMatch[2]);
    }
    let acrMatch: RegExpExecArray | null;
    const acrPat = /\b([A-Z]{2,6})\b/g;
    while ((acrMatch = acrPat.exec(line)) !== null) {
      const acr = acrMatch[1];
      if (!skipList.includes(acr) && !seen.has(acr)) {
        seen.set(acr, i + 1);
      }
    }
  }
  seen.forEach((lineNum, acronym) => {
    if (!expanded.has(acronym)) {
      results.push({ acronym, line: lineNum });
    }
  });
  return results.slice(0, 5);
}

// ── Main linter ───────────────────────────────────────────────────────────

export function lintCopy(markdown: string): CopyLintReport {
  // ── All patterns defined INSIDE the function to avoid minifier name collisions ──

  const sensitiveTerms: Array<{ pattern: RegExp; suggestion: string; message: string }> = [
    { pattern: /\bblacklist\b/i, suggestion: "denylist", message: '"blacklist" has racial connotations. Use "denylist" or "blocklist" instead.' },
    { pattern: /\bwhitelist\b/i, suggestion: "allowlist", message: '"whitelist" has racial connotations. Use "allowlist" or "safelist" instead.' },
    { pattern: /\bmaster\b(?!\s+(?:class|thesis|degree|key\s+pair))/i, suggestion: "primary / main", message: '"master" may have negative connotations in tech context. Consider "primary", "main", or "leader".' },
    { pattern: /\bslave\b/i, suggestion: "replica / worker / secondary", message: '"slave" has harmful connotations. Use "replica", "worker", or "secondary".' },
    { pattern: /\bsanity\s+check\b/i, suggestion: "smoke test / confidence check", message: '"sanity check" is stigmatizing. Use "smoke test" or "confidence check".' },
    { pattern: /\bcrazy\b/i, suggestion: "unexpected / unusual", message: '"crazy" is stigmatizing mental health language. Use "unexpected" or "unusual".' },
    { pattern: /\bdumb\b/i, suggestion: "simple / basic", message: '"dumb" is ableist. Use "simple" or "basic".' },
    { pattern: /\bkill\b(?!\s+(?:switch|signal|process))/i, suggestion: "stop / terminate", message: '"kill" can be jarring. Consider "stop" or "terminate" for most contexts.' },
    { pattern: /\bblind\s+(?:to|spot)\b/i, suggestion: "unaware of / oversight", message: 'Avoid ableist metaphors. Replace with "unaware of" or "oversight".' },
    { pattern: /\bhe\/she\b/i, suggestion: "they", message: 'Use singular "they" instead of "he/she" for gender-neutral writing.' },
    { pattern: /\bhis\/her\b/i, suggestion: "their", message: 'Use "their" instead of "his/her" for gender-neutral writing.' },
    { pattern: /\bguy(s)?\b/i, suggestion: "folks / team / everyone", message: '"guys" is gendered. Use "folks", "team", or "everyone".' },
    { pattern: /\bGrandfathered\b/i, suggestion: "legacy / exempt", message: '"Grandfathered" has racial origins. Use "legacy" or "exempt".' },
    { pattern: /\bstrawman\b/i, suggestion: "straw-person", message: 'Use "straw-person" for inclusive language.' },
  ];

  // Use literal regex array — avoids template-literal escaping issues
  const weaselPatterns: RegExp[] = [
    /\bvery\b/i, /\bquite\b/i, /\breally\b/i, /\bbasically\b/i,
    /\bactually\b/i, /\bjust\b/i, /\bsimply\b/i, /\bobviously\b/i,
    /\bclearly\b/i, /\beasily\b/i, /\bextremely\b/i, /\btotally\b/i,
    /\babsolutely\b/i, /\bliterally\b/i, /\bdefinitely\b/i, /\bcertainly\b/i,
  ];

  const hedgingPatterns: RegExp[] = [
    /we think\b/i, /we believe\b/i, /we feel\b/i,
    /perhaps\b/i, /maybe\b/i, /might want to\b/i,
    /you might\b/i, /you may want\b/i,
    /it is possible that\b/i, /in some cases\b/i,
    /typically\b/i, /generally speaking\b/i,
    /note that\b/i, /please note\b/i,
  ];

  // Passive voice: "[to be] [optional modifier] [past participle]"
  const toBePattern = "(?:is|are|was|were|be|been|being|will be|has been|have been|had been)";
  const pastParts = ["shown","created","given","used","found","done","made","set","called","configured","deployed","installed","enabled","disabled","returned","loaded","sent","received","handled","defined","generated","built","run","executed","triggered","required","supported","added","removed","updated","listed","specified","provided","described","noted","recommended"];

  // ── Setup ────────────────────────────────────────────────────────────────

  const findings: CopyFinding[] = [];
  const lines = markdown.split("\n");

  // Detect code block ranges
  const codeBlockRanges: Array<[number, number]> = [];
  let inCodeBlock = false;
  let codeStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      if (!inCodeBlock) { inCodeBlock = true; codeStart = i; }
      else { inCodeBlock = false; codeBlockRanges.push([codeStart, i]); }
    }
  }

  const isInCodeBlock = (lineNo: number): boolean =>
    codeBlockRanges.some(([s, e]) => lineNo - 1 >= s && lineNo - 1 <= e);

  // ── Per-line checks ──────────────────────────────────────────────────────

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    if (isInCodeBlock(lineNum)) continue;
    if (line.startsWith("#") || line.startsWith("|") || line.trim().length < 20) continue;

    // 1. Passive voice
    const passivePat = new RegExp(
      toBePattern + "\\s+(?:(?:not|also|then|still|already|just)\\s+)?(?:" + pastParts.join("|") + ")(?=\\W|$)",
      "i"
    );
    const passiveMatch = passivePat.exec(line);
    if (passiveMatch) {
      findings.push({
        type: "passive_voice",
        severity: "warning",
        line: lineNum,
        column: passiveMatch.index + 1,
        text: passiveMatch[0],
        message: `Passive voice detected: "${passiveMatch[0]}"`,
        suggestion: "Rewrite in active voice. Identify the subject performing the action.",
      });
    }

    // 2. Sentence length
    const sentenceParts = line.split(/[.!?]+\s+/);
    for (const part of sentenceParts) {
      const wc = part.split(/\s+/).filter(Boolean).length;
      if (wc > 35) {
        findings.push({
          type: "sentence_too_long",
          severity: "warning",
          line: lineNum,
          text: line.slice(0, 80) + (line.length > 80 ? "…" : ""),
          message: `Sentence is ~${wc} words (target: ≤35).`,
          suggestion: "Break into two or more shorter sentences. Lead with the main point.",
        });
        break;
      }
    }

    // 3. Sensitive terms
    for (const term of sensitiveTerms) {
      const m = term.pattern.exec(line);
      if (m) {
        findings.push({
          type: "sensitive_term",
          severity: "error",
          line: lineNum,
          column: m.index + 1,
          text: m[0],
          message: term.message,
          suggestion: `Consider using "${term.suggestion}" instead.`,
        });
      }
    }

    // 4. Weasel words
    for (const wp of weaselPatterns) {
      const wm = wp.exec(line);
      if (wm) {
        findings.push({
          type: "weasel_word",
          severity: "info",
          line: lineNum,
          column: wm.index + 1,
          text: wm[0],
          message: `Weasel word: "${wm[0]}" adds little value`,
          suggestion: `Remove "${wm[0]}" or replace with precise language.`,
        });
        break; // one weasel per line
      }
    }

    // 5. Hedging phrases
    for (const hp of hedgingPatterns) {
      const hm = hp.exec(line);
      if (hm) {
        findings.push({
          type: "hedging",
          severity: "info",
          line: lineNum,
          column: hm.index + 1,
          text: hm[0],
          message: `Hedging phrase: "${hm[0]}" weakens confidence`,
          suggestion: "Make a direct claim. If uncertain, cite the source of uncertainty.",
        });
        break; // one hedge per line
      }
    }
  }

  // 6. Reading grade
  const stats = computeStats(markdown);
  if (stats.fleschKincaidGrade > 12) {
    findings.push({
      type: "reading_grade",
      severity: "warning",
      line: 0,
      text: `FK Grade ${stats.fleschKincaidGrade}`,
      message: `Reading grade level ${stats.fleschKincaidGrade} is above 12. Aim for grade 8–10.`,
      suggestion: "Simplify vocabulary, shorten sentences, and break up complex paragraphs.",
    });
  }

  // 7. Unexpanded acronyms
  const acronyms = findUnexpandedAcronyms(markdown);
  for (const { acronym, line } of acronyms) {
    findings.push({
      type: "unexpanded_acronym",
      severity: "info",
      line,
      text: acronym,
      message: `Acronym "${acronym}" used without expansion on first use`,
      suggestion: `On first use, write: "Full Name (${acronym})"`,
    });
  }

  return {
    findings,
    stats,
    ranAt: new Date().toISOString(),
  };
}
