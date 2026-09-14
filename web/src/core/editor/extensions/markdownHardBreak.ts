import { HardBreak } from "@tiptap/extension-hard-break";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { MarkdownSerializerState } from "prosemirror-markdown";

// ---- markdown-it 类型(最小化,模式同 mathNodes.tsx 的 MarkdownItLike) ----
interface HardBreakToken {
  content: string;
}

interface HardBreakInlineState {
  src: string;
  pos: number;
  push: (type: string, tag: string, nesting: number) => HardBreakToken;
}

interface MarkdownItLike {
  inline: {
    ruler: {
      before: (
        afterName: string,
        ruleName: string,
        fn: (state: HardBreakInlineState, silent: boolean) => boolean,
      ) => void;
    };
  };
  renderer: {
    rules: Record<string, (tokens: HardBreakToken[], idx: number) => string>;
  };
}

const BR_TAG = /^<br\s*\/?>/i;

// 把文本里的 `<br>` 解析成换行。默认 html:false 会把 <br> 转义成文本,表格里用 <br>
// 写的换行就存不住;这里自定义渲染规则(恒输出 <br>),供 HardBreak 的 parseHTML(tag: br)
// 还原成 hardBreak 节点(GFM 表格单元格内换行的事实标准,Obsidian/GitHub 同款)。
export function registerHardBreakSyntax(markdownit: unknown) {
  const md = markdownit as MarkdownItLike & { __hardBreakSyntaxRegistered?: boolean };
  if (md.__hardBreakSyntaxRegistered) return;
  md.__hardBreakSyntaxRegistered = true;

  md.inline.ruler.before("html_inline", "hard_break_tag", (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x3c) return false; // <
    const match = BR_TAG.exec(state.src.slice(state.pos));
    if (!match) return false;
    if (silent) return true;
    state.push("hard_break", "br", 0);
    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.hard_break = () => "<br>";
}

// 表格内 hardBreak 原生会回退输出 HTML(html:false 下退化成字面量 [hardBreak])。
// 覆盖序列化:表格内写 <br>,表格外保持原生 "\<换行>"。
export const MarkdownHardBreak = HardBreak.extend({
  addStorage() {
    return {
      markdown: {
        serialize(
          state: MarkdownSerializerState,
          node: PMNode,
          parent: PMNode,
          index: number,
        ) {
          for (let i = index + 1; i < parent.childCount; i += 1) {
            if (parent.child(i).type !== node.type) {
              const inTable = (state as MarkdownSerializerState & { inTable?: boolean }).inTable;
              state.write(inTable ? "<br>" : "\\\n");
              return;
            }
          }
        },
        parse: {
          setup(markdownit: unknown) {
            registerHardBreakSyntax(markdownit);
          },
        },
      },
    };
  },
});
