import MarkdownIt from "markdown-it";
import { describe, expect, it } from "vitest";

import {
  decodeLatexAttr,
  encodeLatexAttr,
  MATH_BLOCK_INPUT_REGEX,
  MATH_INLINE_INPUT_REGEX,
  registerMathSyntax,
  renderKatex,
} from "./mathNodes";

describe("math input rules", () => {
  it("converts inline math when the opening $ follows a boundary", () => {
    expect("$E=mc^2$".match(MATH_INLINE_INPUT_REGEX)?.[1]).toBe("E=mc^2");
    expect("a ($x$".match(MATH_INLINE_INPUT_REGEX)?.[1]).toBe("x");
    expect("。$x$".match(MATH_INLINE_INPUT_REGEX)?.[1]).toBe("x");
  });

  it("rejects currency-like and CJK-adjacent dollar signs", () => {
    expect("$100 and $200".match(MATH_INLINE_INPUT_REGEX)).toBeNull();
    expect("价格$5,共$8".match(MATH_INLINE_INPUT_REGEX)).toBeNull();
    expect("价格$5,共$".match(MATH_INLINE_INPUT_REGEX)).toBeNull();
    expect("abc$x$".match(MATH_INLINE_INPUT_REGEX)).toBeNull();
  });

  it("rejects escaped and whitespace-padded delimiters", () => {
    expect("\\$5$".match(MATH_INLINE_INPUT_REGEX)).toBeNull();
    expect("$ x$".match(MATH_INLINE_INPUT_REGEX)).toBeNull();
    expect("$x $".match(MATH_INLINE_INPUT_REGEX)).toBeNull();
    expect("$$".match(MATH_INLINE_INPUT_REGEX)).toBeNull();
  });

  it("matches the $$ block trigger at line scope", () => {
    expect("$$".match(MATH_BLOCK_INPUT_REGEX)).not.toBeNull();
    expect("foo $$".match(MATH_BLOCK_INPUT_REGEX)).not.toBeNull();
    expect("$$$".match(MATH_BLOCK_INPUT_REGEX)).toBeNull();
  });
});

describe("registerMathSyntax", () => {
  const md = new MarkdownIt({ html: false });
  registerMathSyntax(md);

  it("parses inline math into math-inline tags", () => {
    expect(md.render("$E=mc^2$")).toContain('<math-inline data-latex="E%3Dmc%5E2">');
  });

  it("parses multi-line block math", () => {
    const html = md.render("$$\na \\times b\n$$");
    expect(html).toContain("<math-block");
    expect(html).not.toContain("<p>$$");
  });

  it("parses single-line block math", () => {
    expect(md.render("$$x^2$$")).toContain("<math-block");
  });

  it("leaves unclosed $$ as plain text", () => {
    expect(md.render("$$\nx")).toContain("<p>");
  });

  it("does not touch math inside code fences or inline code", () => {
    expect(md.render("```\n$x$\n```")).not.toContain("math-inline");
    expect(md.render("`$x$`")).not.toContain("math-inline");
  });

  it("does not convert $ preceded by letters or digits", () => {
    expect(md.render("abc$x$")).not.toContain("math-inline");
  });

  it("respects escaped dollars", () => {
    expect(md.render("\\$5 and \\$6")).not.toContain("math-inline");
  });

  it("keeps ```math as a plain code fence", () => {
    expect(md.render("```math\nE=mc^2\n```")).toContain("language-math");
  });

  it("is idempotent", () => {
    const md2 = new MarkdownIt();
    registerMathSyntax(md2);
    registerMathSyntax(md2);
    expect(md2.render("$x$")).toContain("<math-inline");
  });
});

describe("renderKatex", () => {
  it("renders valid latex", () => {
    const result = renderKatex("x^2", false);
    expect(result.error).toBeNull();
    expect(result.html).toContain("katex");
  });

  it("reports invalid latex as error without throwing", () => {
    expect(renderKatex("\\frac{", true).error).not.toBeNull();
  });

  it("returns empty html for blank latex", () => {
    expect(renderKatex("   ", true)).toEqual({ html: "", error: null });
  });
});

describe("latex attribute encoding", () => {
  it("round-trips latex", () => {
    const latex = "a\\frac{1}{2}\nb & <c>";
    expect(decodeLatexAttr(encodeLatexAttr(latex))).toBe(latex);
  });

  it("decodes null to empty string", () => {
    expect(decodeLatexAttr(null)).toBe("");
  });

  it("falls back to raw value on malformed encoding", () => {
    expect(decodeLatexAttr("%E0%A4%A")).toBe("%E0%A4%A");
  });
});
