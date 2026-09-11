import katex from "katex";

// ---- InputRule 正则 ----
// 开 $ 前一位不能是字母/数字(CJK 含内)/$/\ —— 货币安全;内容首尾不能是空白
export const MATH_INLINE_INPUT_REGEX =
  /(?<![\p{L}\p{N}$\\])\$([^$\s](?:[^$\n]*[^$\s])?)\$$/u;

export const MATH_BLOCK_INPUT_REGEX = /(?<=^|[^$])\$\$$/;

// ---- 属性编解码 ----
export function encodeLatexAttr(latex: string) {
  return encodeURIComponent(latex);
}

export function decodeLatexAttr(value: string | null) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// ---- markdown-it 类型(最小化,模式同 InternalNodeLink.tsx 的 MarkdownItLike) ----
interface MathToken {
  attrs: Array<[string, string]> | null;
  content: string;
  block?: boolean;
  map?: [number, number] | null;
  attrGet: (name: string) => string | null;
}

interface MathInlineState {
  src: string;
  pos: number;
  push: (type: string, tag: string, nesting: number) => MathToken;
}

interface MathBlockState {
  src: string;
  bMarks: number[];
  tShift: number[];
  eMarks: number[];
  line: number;
  push: (type: string, tag: string, nesting: number) => MathToken;
}

interface MarkdownItLike {
  inline: {
    ruler: {
      before: (
        afterName: string,
        ruleName: string,
        fn: (state: MathInlineState, silent: boolean) => boolean,
      ) => void;
    };
  };
  block: {
    ruler: {
      before: (
        afterName: string,
        ruleName: string,
        fn: (
          state: MathBlockState,
          startLine: number,
          endLine: number,
          silent: boolean,
        ) => boolean,
      ) => void;
    };
  };
  renderer: {
    rules: Record<string, (tokens: MathToken[], idx: number) => string>;
  };
}

// ---- markdown-it 语法注册(幂等,模式同 registerInternalNodeSyntax) ----
// 依据:markdown-it 内联链中 escape / code-span 规则先于 image,
// 因此 \$ 转义与行内代码 `$x$` 天然安全;$ 是 markdown-it 的 terminator char,
// 文本规则会在 $ 处停下交出控制权。
export function registerMathSyntax(markdownit: unknown) {
  const md = markdownit as MarkdownItLike & { __mathSyntaxRegistered?: boolean };
  if (md.__mathSyntaxRegistered) return;
  md.__mathSyntaxRegistered = true;

  md.inline.ruler.before("image", "math_inline", (state, silent) => {
    const src = state.src;
    const pos = state.pos;
    if (src.charCodeAt(pos) !== 0x24) return false; // $
    if (pos > 0 && /[\p{L}\p{N}$\\]/u.test(src[pos - 1])) return false;

    const end = src.indexOf("$", pos + 1);
    if (end < 0) return false;
    const content = src.slice(pos + 1, end);
    if (!content || content.includes("\n")) return false;
    if (/\s/.test(content[0]) || /\s$/.test(content)) return false;
    if (silent) return true;

    const token = state.push("math_inline", "", 0);
    token.attrs = [["data-latex", encodeLatexAttr(content)]];
    token.content = content;
    state.pos = end + 1;
    return true;
  });

  md.renderer.rules.math_inline = (tokens, idx) => {
    const latex = tokens[idx].attrGet("data-latex") || "";
    return `<math-inline data-latex="${latex}"></math-inline>`;
  };

  md.block.ruler.before("fence", "math_block", (state, startLine, endLine, silent) => {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const lineText = state.src.slice(startPos, max);
    if (!lineText.startsWith("$$")) return false;
    if (silent) return true;

    let content: string;
    let lastLine = startLine;
    const sameLineClose = lineText.indexOf("$$", 2);
    if (sameLineClose >= 2 && lineText.slice(sameLineClose + 2).trim() === "") {
      content = lineText.slice(2, sameLineClose);
    } else {
      content = lineText.slice(2);
      let closed = false;
      for (let line = startLine + 1; line < endLine; line++) {
        const lpos = state.bMarks[line] + state.tShift[line];
        const lmax = state.eMarks[line];
        const ltext = state.src.slice(lpos, lmax);
        const close = ltext.indexOf("$$");
        if (close >= 0 && ltext.slice(close + 2).trim() === "") {
          if (close > 0) content += "\n" + ltext.slice(0, close);
          lastLine = line;
          closed = true;
          break;
        }
        content += "\n" + ltext;
        lastLine = line;
      }
      if (!closed) return false;
    }

    const token = state.push("math_block", "", 0);
    token.block = true;
    token.attrs = [["data-latex", encodeLatexAttr(content)]];
    token.content = content;
    token.map = [startLine, lastLine + 1];
    state.line = lastLine + 1;
    return true;
  });

  md.renderer.rules.math_block = (tokens, idx) => {
    const latex = tokens[idx].attrGet("data-latex") || "";
    return `<math-block data-latex="${latex}"></math-block>`;
  };
}

// ---- KaTeX 包装 ----
export function renderKatex(
  latex: string,
  displayMode: boolean,
): { html: string; error: string | null } {
  if (!latex.trim()) return { html: "", error: null };
  try {
    return {
      html: katex.renderToString(latex, {
        displayMode,
        throwOnError: true,
        strict: false,
        trust: false,
      }),
      error: null,
    };
  } catch (error) {
    return { html: "", error: error instanceof Error ? error.message : String(error) };
  }
}
