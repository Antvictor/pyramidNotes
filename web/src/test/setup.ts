import '@testing-library/jest-dom/vitest'

// jsdom 未给 Text 节点实现 getClientRects/getBoundingClientRect(Element 有)。
// prosemirror-view 的 coordsAtPos → singleRect 会对选区所在的文本节点调用它们,
// 于是任何「编辑器已获得焦点 + 事务带 scrollIntoView」的测试都会崩溃
// (target.getClientRects is not a function)。这里补上空实现。
// 只挂在 Node.prototype 上,Element 自带的实现会继续遮蔽它。
const zeroRect = () =>
  ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect

if (typeof Node !== 'undefined' && !('getClientRects' in Node.prototype)) {
  Object.defineProperty(Node.prototype, 'getClientRects', {
    configurable: true,
    value: () => [] as unknown as DOMRectList,
  })
}

if (typeof Node !== 'undefined' && !('getBoundingClientRect' in Node.prototype)) {
  Object.defineProperty(Node.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: zeroRect,
  })
}

// 同样地,coordsAtPos 在「空 Range」分支(jsdom 的 navigator.vendor 让 prosemirror-view
// 判成 webkit)下传的是 document.createRange() 得到的 Range,而 Range 不继承 Node,
// 上面的 Node 补丁覆盖不到,jsdom 的 Range 也没有这两个方法 → 同样崩。这里补上。
if (typeof Range !== 'undefined' && !('getClientRects' in Range.prototype)) {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => [] as unknown as DOMRectList,
  })
}

if (typeof Range !== 'undefined' && !('getBoundingClientRect' in Range.prototype)) {
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: zeroRect,
  })
}
