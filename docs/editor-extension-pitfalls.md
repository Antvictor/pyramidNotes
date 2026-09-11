# 编辑器扩展踩坑指南

编辑器扩展(extensions/)中的脆弱机制与已知坑位。改动前先读;修复脆弱区后在此追加。

## extend CodeBlockLowlight 会重复注册 lowlight 插件(挂载即崩)

**现象**:编辑器挂载抛 `Cannot read properties of undefined (reading 'localsInner')`,与笔记内容无关。

**根因链**:

1. tiptap 的 `getExtensionField` 会把扩展方法内的 `this.parent` 绑定为**父扩展的同名字段**。
2. `CodeBlockLowlight` 的 `addProseMirrorPlugins` 实现是 `[...(this.parent?.() || []), LowlightPlugin(...)]`。
3. 一旦 `CodeBlockLowlight.configure(...).extend({...})`(或先 extend 后 configure,顺序无关),
   `this.parent` 解析到已 configure 实例的同名字段(其返回值内含一份 LowlightPlugin),
   再叠加自身一份 → **lowlight 插件注册两次**。
4. 本仓库存在两份 prosemirror-view(`node_modules/` 根副本由 `@tiptap/extension-code-block-lowlight`
   解析使用,`web/node_modules/` 副本由 `@tiptap/core`/编辑器视图使用)。重复注册产生两份
   根副本 DecorationSet;prosemirror-view 的 `DecorationGroup.from` 在成员数 ≥2 且不全是
   本模块 DecorationSet 实例时走扁平化路径,`m.members` 为 undefined → `concat(undefined)`
   → group 中出现 undefined 成员 → 挂载崩溃。

**修复**(enhancedCodeBlock.tsx):extend 时覆盖 `addProseMirrorPlugins`,只透传 parent 链结果,
保证全局恰有一份 LowlightPlugin:

```ts
CodeBlockLowlight.configure({ lowlight }).extend({
  addNodeView() { /* ... */ },
  addProseMirrorPlugins() {
    return this.parent?.() || []; // 只取父链(CodeBlock 基类插件 + 唯一 LowlightPlugin)
  },
});
```

**回归测试**:`enhancedCodeBlock.test.ts` 中 "registers exactly one lowlight plugin"。

**规则**:对任何 `addProseMirrorPlugins` 同时「调用 `this.parent?.()`」且「追加自有插件」的
官方扩展做 `.extend()` 时,必须检查插件是否会被重复注册;必要时同样透传 parent 结果。

## nodeInputRule 有 match[1] 时只替换捕获组(定界符残留)

**现象**:输入 `$E=mc^2$` 转换为行内公式节点后,两侧各残留一个 `$` 文本字符。

**根因**:tiptap `nodeInputRule`(@tiptap/core `src/inputRules/nodeInputRule.ts`)的 handler
在 `match[1]` 存在时走特殊分支:仅用 `replaceWith` 替换**捕获组的范围**,
还会先把 `match[0]` 的最后一个字符重新 `insertText` 回去。因此正则写成
`\$(内容)\$` 时,两个 `$` 定界符都不在被替换区间内,变成残留文本。

**修复**(mathNodes.tsx):不用 `nodeInputRule`,直接 `new InputRule({...})`,
handler 里 `state.tr.replaceWith(range.from, range.to, this.type.create(attrs))`
替换完整匹配区间。`undoable` 默认 true,撤销由 input-rules 的重放机制处理。

**规则**:InputRule 的 find 正则带捕获组且希望整段匹配(含定界符)被节点替换时,
禁止使用 `nodeInputRule`,必须自定义 handler 替换完整 `range`。

## 内置 Keymap 扩展的 Enter 抢先于 input rules(fence + 回车建块失效)

**现象**:` ` ` ```mermaid ` + Enter 不会创建代码块(只有 ` ```mermaid ` + 空格才会),
段落直接被 split;input rules 插件自带的「Enter 触发」永远轮不到。

**根因**:tiptap 内置 Keymap 扩展(@tiptap/core `Keymap`)绑定了
`Enter: handleEnter = first([newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock])`,
对任意段落都会成功返回 true;插件 props 按序执行,它排在 input-rules 插件之前
→ input rules 的 handleKeyDown(Enter)支持被短路。

**修复**(enhancedCodeBlock.tsx):在扩展自己的 `addKeyboardShortcuts` 里加 `Enter` 绑定。
每个扩展的快捷键生成**独立的 keymap 插件**,而 `ExtensionManager.get plugins` 对
extensions 数组 reverse 后稳定排序(同 priority 时注册序靠后者排前)→ 本扩展的
keymap 插件先于内置 Keymap 执行。绑定内仅当光标所在段落文本恰为 ` ```[lang] `
(正则 `/^(```|~~~)([a-z0-9_+-]+)?$/`)时接管,否则回落父级 Enter
(CodeBlock 的三连回车退出等)+ 内置 handleEnter。

**规则**:凡是「输入 + Enter 建块」类需求,不能依赖 input rules 的 Enter 支持,
必须在扩展的 addKeyboardShortcuts 中自行绑定 Enter 并自行回落父级行为。

## 块边界位置 resolve 到 depth 0(边界删除定位算错)

**现象**:按「相邻段落行首 Backspace」判断的代码永远不触发,原生行为照常执行。

**根因**:`doc.resolve(pos)` 在**两个块节点之间的边界**返回 `depth: 0`(`$from.parent` 是 doc),
不是在下一个块内部。即 `doc(mathBlock, paragraph("hello"))` 中段落起始的**光标位置是 2**
(块起点 1 + 1),`resolve(1)` 得到的是 doc 级边界、`parentOffset: 1`。

**修复**(enhancedCodeBlock.tsx / mathNodes.tsx):判断一律用
`$from.parent.isTextblock` 先排除 doc 级位置,再用
`$from.before($from.depth)` / `$from.after($from.depth)` 取块边界,配 `nodeBefore`/`nodeAfter`
定位相邻节点;真正跨不过去的边界 = 相邻块是渲染型块(codeBlock 且 language 为 mermaid/math)
或 `mathBlock`,否则返回 false 回落原生。

**规则**:写「相邻块」类逻辑时不要用裸 `resolve(pos).parent`;先加 `isTextblock` 守卫。
测试里把光标放到段首要用 `block.nodeSize + 1`(段内第一个文本位置),不是 `nodeSize`。

## React NodeView 的 textarea/input 按键必须用原生监听(React onKeyDown 晚于 ProseMirror)

**现象**:双击进入公式块编辑、删空内容后再按删除键无反应;或删一下反而把整块删了。

**根因**:React 18 把合成事件监听挂在**根容器**上,而 NodeView 的 DOM 在
`ProseMirror view.dom` 内部。事件冒泡顺序是 target → … → `view.dom`(PM 处理)→ … → 根容器
(React 处理),**PM 先跑**。PM 的 keydown 用**它自己的选区**(编辑 atom 时选区可能还停在整块上)
执行默认删除键,于是 `onKeyDown` 里再删就晚了。PM 只在 `nodeView.stopEvent(event)` 为真时
才忽略事件(`eventBelongsToView`),而给渲染态也开 stopEvent 会让块无法被选中。

**修复**(mathNodes.tsx):在 `useEffect` 里对真实 `textarea` 元素
`addEventListener("keydown", ...)`,命中需要接管的键时
`event.preventDefault(); event.stopPropagation();` —— target 阶段的原生监听早于
`view.dom` 的 PM 监听,stopPropagation 直接切断到 PM 与 React 的两条路径。读取当前值用
`el.value` 而不是闭包里的 state,避免 stale。

**规则**:NodeView 内部的表单元素若要在按键上抢在 ProseMirror 之前,必须用**原生**监听 +
`stopPropagation`,不能依赖 React `onKeyDown`。效果要保持,可以不给依赖数组(effects 每次
渲染重挂,闭包总是最新)。

## 扩展 → React NodeView 的通信用 transaction meta

**现象**:atom 节点(`mathBlock`)在相邻段落行首被删除键命中时,原生会**直接删掉整个节点**
(atom 没有「内部」位置),与原生代码块「进入块内编辑」的体验不一致。

**修复**(mathNodes.tsx):扩展的 `addKeyboardShortcuts.Backspace/Delete` 在边界处
`dispatch(state.tr.setMeta(MATH_BLOCK_EDIT_META, pos).scrollIntoView())` 并返回 true;
React NodeView 里 `useEffect` 订阅 `editor.on("transaction", ...)`,
`transaction.getMeta(MATH_BLOCK_EDIT_META) === getPos()` 时 `startEdit()`。
空块则直接删除节点,不进编辑。

**规则**:需要「扩展的键盘/命令逻辑」驱动「React NodeView 改状态」时,用带 meta 的事务 +
`editor.on("transaction")`;不要让扩展去查 DOM 或持有组件引用。

## atom NodeView 用 textarea 承载输入时,进入编辑必须显式设置插入点

**现象**:`$$` + 回车建空公式块、写好并渲染后,从下方段落行首 Backspace 进块,光标停在源码
**首行行首**;而 ```mermaid / ```math 代码块会停在源码**末行行末**。

**根因**:代码块是**可编辑文本节点**,进块时扩展 dispatch 一个块内 `TextSelection`,PM 选区与
真实 `contenteditable` 同步后,浏览器自动把插入点摆在对应位置。mathBlock 是 **atom + React
NodeView**,输入由 `<textarea>` 承载 —— 它完全不在 PM 的选区体系里:`startEdit()` 只调
`ta.focus()`,而新挂载 textarea 的默认插入点是偏移 0 → 视觉上「光标跑到开头」。而且 atom
没有「内部」位置,扩展也无法用 `TextSelection` 表达「把光标放在源码末尾」。

**修复**(mathNodes.tsx):边界删除的事务 meta 由 `pos`(数字)改为 `{ pos, caret }`,
`caret` 为 `"end"`(从下方向上 Backspace 进块)/ `"start"`(从上方向下 Delete 进块);
NodeView 收到后把方向存进 ref,在 focus 的 rAF 里 `ta.setSelectionRange(index, index)`。

**规则**:NodeView 内部的 `<textarea>`/`<input>` 进入编辑态时,插入点必须显式
`setSelectionRange` —— `focus()` 只会保留/默认为偏移 0。若插入点该由外部(扩展的键盘逻辑)
决定,把方向或偏移**随事务 meta 一起传进来**,不要试图用 PM 选区表达:atom 节点没有内部位置。

## 渲染态/编辑态跟随选区(RenderedCodeBlockView)

**现象**:```mermaid / ```math 渲染后必须点一下才渲染、或从块外删除键进不去源码。

**修复**(enhancedCodeBlock.tsx):NodeView 订阅 `editor.on("selectionUpdate", ...)`,
选区落进块内容区间 `[pos+1, pos+nodeSize-1]` → `enterEdit()`,离开 → `exitEdit()` 并重新渲染。
`enterEdit()` 里必须**显式 dispatch 一个块内 TextSelection**:仅 `contentDOM.focus()` 时
PM 状态选区可能仍停在整块(NodeSelection),后续删除键会作用到整块而非源码。
空块(新建即编辑态)用 `sawSelectionInside` 标记,避免第一条 `selectionUpdate`(选区还在块外)
把刚进入的编辑态立刻退掉。

**规则**:自绘渲染层 + 原生 contentDOM 的 NodeView,「何时显示源码」应由 PM 选区驱动
(selectionUpdate),不要只绑鼠标事件。

## React NodeView 在 vitest/jsdom 里的挂载条件

**现象**:用 `new Editor({...})` 写测试时,React NodeView 完全不渲染,`view.dom` 里是
`renderHTML` 的原始输出,`querySelector(".math-block-view")` 恒为 null。

**根因**:tiptap `ReactRenderer` 只在 `editor.isEditorContentInitialized === true` 时走
`flushSync(render)` 同步渲染;该标记仅由 `@tiptap/react` 的 `EditorContent` 组件设置。
否则走 `queueMicrotask`,jsdom 下不会同步出现。

**修复/用法**:React NodeView 的交互测试要用
`@testing-library/react` 的 `render(<Harness/>)`,Harness 内用 `useEditor(...)` +
`<EditorContent editor={editor}/>`,并把交互包在 `act(async () => {...})` 里(meta/state 驱动的
重渲染需要 act 才 flush)。纯 DOM NodeView(enhancedCodeBlock)不需要,`new Editor()` 即可。

**补充**:即便用了 `EditorContent`,NodeView 的 React 树首挂仍走 `queueMicrotask`,
而 RTL 的同步 `render()` 不排空微任务队列。于是 `render()` 之后立刻 dispatch 的事件会**先于**
NodeView 的 `useEffect`(事务监听等)注册而丢失 —— 表现为「同一个用例,节点排第一位时通过、
排在段落之后时 `querySelector("textarea")` 为 null」。实测(仅日志可辨,断言看不出来):

```
render()                                  // 同步 act,微任务未排空
setTextSelection(...)                     // 发事务 → NodeView 还没注册监听 → 丢了
await act(async () => { keydown })        // 微任务此时才排空,已晚
```

**用法**:`render()` 之后、派发任何需要 NodeView 感知的事件之前,先空 flush 一次:

```ts
await act(async () => {
  await Promise.resolve();
});
```

**规则**:测试 React NodeView → 必须 `useEditor` + `EditorContent` + `act`,且首挂前先空 flush;
测试纯 DOM NodeView → 直接 `new Editor()` + 派发 DOM 事件。

## tiptap 只在选区「数值位置」变化时才发 selectionUpdate(退出编辑后不渲染)

**现象**:代码块内光标停在末尾时三连回车退出(原生 `exitOnTripleEnter`),块停在编辑态不渲染,
必须再敲任意一次键才看到渲染结果。公式块 `$`、` ```math `、` ```mermaid ` 都复现。

**根因**:tiptap 的 `dispatchTransaction`(@tiptap/core
`useEditor` → `dispatchTransaction`)用 `!oldSelection.eq(newSelection)` 决定是否 `emit("selectionUpdate")`。
`eq` 只比较 from/to 的**数值**。三连回车退出时:删除块内末尾的两个换行后,`pos+1+content.size`
恰好等于「块后新插入空段落内的第一个位置」的数值 → 选区对象变了但**数值相同** → 不发事件。
只监听 `selectionUpdate` 的 NodeView 因此永远收不到这次「选区已离开本块」的通知。

**修复**(enhancedCodeBlock.tsx):渲染/编辑态同步函数 `syncEditState` **同时**挂
`editor.on("transaction", ...)` 与 `editor.on("selectionUpdate", ...)`;
`destroy()` 里两条都要 `off`。判定仍是「选区是否落在 `[pos+1, pos+nodeSize-1]` 内」。

**规则**:NodeView 的「选区驱动状态」(渲染态/编辑态、选中态等)不能只挂在 `selectionUpdate`;
凡是用选区位置判断的逻辑,一律再挂一份 `transaction`,否则「对象变了但数值没变」的选区变更会被漏掉。

## NodeView 子类构造函数必须把 getPos 透传给 super

**现象**:` ```mermaid ` 块渲染后,从块外按删除键光标进去了,但显示的还是渲染内容,看不到源码;
而 ` ```math ` 块正常。(两者只差一个 NodeView 子类。)

**根因**:`MermaidBlockView` 的构造函数签名漏了第三个参数 `getPos`,只写了 `(node, editor)`,
再 `super(node, editor)`。基类 `this.getPos` 因此是 `undefined`,
`syncEditState` / `enterEdit` / `deleteSelf` 全部在 `pos == null` 处**静默返回** —— 不报错,
只是「什么都没发生」。ProseMirror 传给 `addNodeView` 工厂的 `getPos` 是**每个节点一份的闭包**,
不会自动落到子类上。

**修复**(enhancedCodeBlock.tsx):`constructor(node, editor, getPos) { super(node, editor, getPos); ... }`。

**规则**:继承 NodeView 基类时,构造函数签名必须与工厂收到的参数一一对应并全部透传;
`pos == null` 处的静默 return 是这类漏参的典型伪装,排查「进入了但不显示/不生效」时先确认 `getPos` 到位。

## 不要用 parentElement 反查自建 DOM,构造时留引用

**现象**:` ```math ` 渲染 → 再编辑 → 删空源码 → 再按删除键,抛
`Cannot read properties of null (reading 'style')`(stack 指向 NodeView 的 `applyEditMode`)。

**根因**:`applyEditMode` 里要用到自建的 `<pre>`,实现是 `this.contentDOM.parentElement` 反查。
一旦 DOM 被挪动(`contentDOM` 被移出 `<pre>`),`parentElement` 变成 `null` 或不再是 `<pre>`,
下一次 `applyEditMode` 直接对 `null.style` 赋值抛错。反查把「DOM 当前挂在哪」当成了不变量,
但这个视图本身就是靠挪 DOM 切换渲染/编辑态的。

**修复**(enhancedCodeBlock.tsx):外层 `this.dom`(wrapper)与 `renderLayer` 都在构造时存成字段,
显隐只切 wrapper 的 class,不碰 contentDOM、也不做任何反查:

```ts
private applyEditMode() {
  this.dom.classList.toggle("is-editing", this.isEditing);
}
```

**规则**:NodeView 里自己创建的 DOM 一律在构造时留引用,不要用 `parentElement` / `querySelector`
在后续回调里反查;反查在「DOM 会被自己挪动」的场景下必然过时。

## 改 contentDOM 自身属性会触发 ProseMirror 重建整个 NodeView

**现象**:渲染态/编辑态一切换,块内渲染结果闪一下、防抖计时器/异步渲染状态丢失;
单元测试里「Enter 建 ```mermaid → 退出编辑后渲染」拿到的是**已被换掉**的旧
`.rendered-code-view` 元素,断言 `innerHTML` 恒为空。

**根因**:contentDOM 是 `<pre>` 之后,若 `applyEditMode` 用
`this.contentDOM.style.display = ...` 切换显隐,这是一条 **target == contentDOM** 的
`attributes` mutation。`DOMObserver.registerMutation`(prosemirror-view)对 attributes 的
豁免只有三条:`desc == docView`、`attributeName == "contenteditable"`、
`attributeName == "style" && !mut.oldValue && !mut.target.getAttribute("style")` —— 我们这条
style 设置后 `getAttribute("style")` 为真,三条都不成立;接着本视图的 `ignoreMutation`
(`mut.target !== this.contentDOM`)也返回 false。于是 PM 把这当作「contentDOM 内容/属性被外部改了」,
把 desc 标脏并在下一轮 `ViewTreeUpdater.addNode` 里**重建整个 NodeView**。

**修复**(enhancedCodeBlock.tsx):显隐改成切 wrapper 的 class,由 CSS 决定:
`this.dom.classList.toggle("is-editing", this.isEditing)`,markdown.css 里

```css
.rendered-code-block pre { display: none; }
.rendered-code-block.is-editing pre { display: block; }
.rendered-code-block.is-editing .rendered-code-view { display: none; }
```

wrapper 的 class mutation 落在 contentDOM 之外 → `ignoreMutation` 吞掉,PM 不重建。

**规则**:NodeView 里任何**非内容**的视觉状态(显隐、尺寸、主题)都不要写到 contentDOM 自身的
inline style 上 —— 那是 attribute mutation、会被 PM 当成内容变更并重建视图。写到 contentDOM
之外的 wrapper class 上,或写到视图自绘的兄弟节点上。jsdom 能复现这类重建
(旧元素被换掉 → 断言失败),是比崩溃更可靠的回归信号。

## 卸载持有焦点的元素后要把焦点还给编辑器(光标消失)

**现象**:连续回车退出编辑、或删空后按删除键删掉整块之后,ProseMirror 选区是对的,但页面上**看不到光标**。

**根因**:编辑态由一个 `<textarea>` / `contentEditable` 承载 DOM 焦点。退出编辑或替换节点时,
这个元素被卸载,`document.activeElement` 掉回 `<body>`;PM 只是**状态**上的选区,
没有 DOM 焦点就没有可见光标。

**修复**(mathNodes.tsx 的 React NodeView、enhancedCodeBlock.tsx 的 DOM NodeView):
凡是「卸载了持有焦点的元素」的分支(退出编辑、自删整块),收尾都补一句 `editor.view.focus()`。
测试里可用 `editor.view.hasFocus()` 断言(jsdom 下 `focus()` 有效,前提是 `view.dom` 带
`contenteditable`)——注意 `hasFocus` 会读 `activeElement`,会被**上一个测试**的焦点残留影响,
断言顺序要小心。

**规则**:NodeView 主动移除「当前可能持有 DOM 焦点」的元素后,必须显式 `view.focus()`,
否则表现成「选区正常但光标消失」。

## prosemirror-view 在 NODE_DIRTY 时跳过 spec.update(NodeView 缓存落后于文档)

**现象**:渲染型块(` ```mermaid ` / ` ```math `)删空源码后按删除键,编辑区不消失;继续按删除键,
块内渲染出错误提示、源码是删空前的残留(`graph TD` 只剩 `g`)。

**根因**:`CustomNodeViewDesc.update`(prosemirror-view)开头即
`if (this.dirty == NODE_DIRTY) return false;` —— 内容由 contentDOM 的 DOM 改动读回时,desc 被标记
`NODE_DIRTY`,`spec.update` **根本不会被调用**,NodeView 缓存的 `this.node` 就此停在「上一次编辑前」。
删除键的空判断 `this.node.textContent.trim().length === 0` 读缓存 → 判成「非空」,既不删块也不回落;
`scheduleRender` 也读缓存 → 渲染出上一版残留文本。

**修复**(enhancedCodeBlock.tsx):加 `liveNode()`,每次用 `this.getPos()` 从
`editor.state.doc.nodeAt(pos)` 取实时节点(顺带刷新缓存);删除判断、`nodeSize`、渲染内容一律读它。

```ts
protected liveNode(): PMNode {
  const pos = typeof this.getPos === "function" ? this.getPos() : undefined;
  if (pos == null) return this.node;
  const node = this.editor.state.doc.nodeAt(pos);
  if (!node || node.type !== this.node.type) return this.node;
  this.node = node;
  return node;
}
```

**回归测试**:`enhancedCodeBlock.test.ts` 的 `stale cache tolerance` 两组。写这类测试有两个坑:
- 断言别用「`firstChild`/`lastChild` 是段落」——文档尾部本就带一个空段落,会把「块没被删」掩盖掉。
  用「文档里不再有 codeBlock」判定。
- 退出编辑若走 `setTextSelection`(事务),PM 的 view 更新会**先调用 `update()` 把缓存刷回实时文档**,
  从而掩盖 bug。要落到「读了缓存」的真实路径,得用不走事务的出口(点块外触发的 `mousedown`)。

**规则**:NodeView 里任何「用于行为判断」的节点数据(文本、`nodeSize`、attrs)都必须从实时文档取
(`getPos()` + `doc.nodeAt`),不能信 `this.node` 缓存 —— 内容由 contentDOM 直改时框架不会通知视图。

## contentDOM 不能是被编辑元素之外再套一层内联容器(Chrome 删空时会摘掉它)

**现象**:```` ```math ```` / ```` ```mermaid ```` 块里逐字删除后,**块永远删不掉**,文档状态停在
「删空前的第一个字符」,块回到渲染态还会渲染出那个残留字符(mermaid 报
`No diagram type detected ... for text: g`)。原生代码块(```js)无此问题。

**根因链**(真实浏览器 + CDP + MutationObserver 定位,jsdom 复现不出来):

1. 旧结构把 contentDOM 建成 `<pre>` 内的 `<code>`:`div.rendered-code-block > pre > code`。
2. Chrome 的 contenteditable 编辑器在内容被删空时,会把这个空的内联 `<code>` 从 `<pre>` 里
   **摘掉、换成 `<br>`**。这是 Blink 内部改 DOM,**不走任何 JS API** ——
   补丁 `removeChild` / `replaceChild` / `appendChild` / `innerHTML` 全都捕获不到,
   只有 `MutationObserver` 看得见(record 的 target 是 `<pre>`)。
3. 这个 record 的 target 是 `<pre>`、在 contentDOM 之外 → 本视图的
   `ignoreMutation` 返回 true 把它**吞掉** → ProseMirror 永远不知道结构变了,
   `desc.contentDOM` 仍指向已被摘除的 `<code>`。
4. 于是后续键入/删除全部写进脱离文档的 `<code>`,`editor.state.doc` 停在删空前的一版;
   空判断读实时文档仍是那个残留字符 → 既不删块也不回落。
   (PM 自家代码块同结构却没事:它默认 `ignoreMutation` 返回 false,能读到 Chrome 的改动并自愈。)

**修复**(enhancedCodeBlock.tsx):**让 contentDOM 就是要被编辑的那个元素**,即 `<pre>` 本身,
不再套 `<code>`。Chrome 的改动于是落在 contentDOM 上 → `ignoreMutation` 不再忽略 → PM 能读回并自愈。
副作用:`<code>` 消失后 `.prose pre code` 的等宽字体/字号不再命中,已在 markdown.css 的
`.rendered-code-block pre` 里补齐。

```ts
const pre = document.createElement("pre");
pre.textContent = node.textContent;
this.contentDOM = pre; // 不要再 pre.appendChild(document.createElement("code"))
```

**回归测试**:`enhancedCodeBlock.test.ts` 的 "uses the `<pre>` element itself as the contentDOM"。
**注意**:jsdom 不会触发 Blink 的这套内部手术,只有真实浏览器(CDP + 真 key event)能复现这类 bug。

**规则**:自绘 NodeView 的 contentDOM 必须是「用户真正在编辑的那个元素」。不要在 contentDOM 外
再包一层内联元素(尤其 `<span>`/`<code>`)当编辑容器 —— Chrome 会在删空/规范化时直接把它摘掉,
而这类改动不走 JS API、又落在 contentDOM 之外被 `ignoreMutation` 吞掉,PM 无法自愈。

## 渲染态 stopEvent 吞掉删除键(非 NodeSelection 时删除无反应)

**现象**:渲染态的块(源码已空)按 Backspace/Delete「没反应」,块删不掉。

**根因**:`RenderedCodeBlockView.stopEvent` 在渲染态对渲染层事件返回 `true`
(`!this.isEditing && this.renderLayer.contains(event.target)`)。prosemirror-view 的
`eventBelongsToView` 会沿 target→`view.dom` 检查每个 desc 的 `stopEvent`,命中即返回 false →
**PM 完全忽略该事件**。于是删除只可能来自两种途径:选区恰是 `NodeSelection`(原生删除生效),
或本视图自己接住。而块回到渲染态、选区又不是 NodeSelection 时,两条路都断了。

**修复**(enhancedCodeBlock.tsx):`handleBlockKeyDown`(渲染态,挂在 `this.dom` 上)在
源码为空时直接 `deleteSelf()`,与编辑态的删除语义一致;非空则把 Backspace/Delete 冒泡给 PM 原生处理。

```ts
if (
  (event.key === "Backspace" || event.key === "Delete") &&
  this.liveNode().textContent.trim().length === 0
) {
  event.preventDefault();
  event.stopPropagation();
  this.deleteSelf();
  return;
}
```

**回归测试**:`enhancedCodeBlock.test.ts` 的
"deletes an empty block from the render state when it is not a NodeSelection"。

**规则**:给渲染态开 `stopEvent` 就等于把该区域从 PM 的默认按键/选区逻辑里摘出去;凡是在这块区域里
仍要生效的键(删除、Enter 进编辑、单字符进编辑),都必须在自己的 DOM 监听里显式实现,不能指望原生。

## 验证注意

- `tsc --noEmit` 因存量类型错误(路径别名未继承等)不可用;以 `vitest` + `eslint` + `vite build` 为准。
- vitest 需 Node 22(项目 `.nvmrc`):`PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" pnpm exec vitest run`。
- jsdom 没给 **Text 节点**实现 `getClientRects`/`getBoundingClientRect`(Element 有),而
  prosemirror-view 的 `coordsAtPos` → `singleRect` 会对选区文本节点调用 → 一旦测试里编辑器
  获得了 DOM 焦点,任何带 `scrollIntoView()` 的事务都会崩(`target.getClientRects is not a function`)。
  同一函数在「空 Range」分支下传的是 `document.createRange()` 的 **Range**(jsdom 的
  `navigator.vendor` 让 prosemirror-view 判成 webkit),而 `Range` 不继承 `Node`,所以
  `Node.prototype` 上的补丁覆盖不到。`src/test/setup.ts` 里对 **`Node.prototype` 和
  `Range.prototype` 都**补了这两个空实现;遇到同类崩先确认两处 polyfill 都在。

