const MARKER = /^\s*\[([ xX])\]\s+/;
const LIST_TYPE_NAMES = new Set(['bulletList', 'orderedList']);

const isList = (node) => LIST_TYPE_NAMES.has(node.type.name);

function leadingText(paragraph) {
  let text = '';
  for (let index = 0; index < paragraph.childCount; index += 1) {
    const child = paragraph.child(index);
    if (!child.isText) break;
    text += child.text ?? '';
  }
  return text;
}

function stripLeading(paragraph, length, schema) {
  let remaining = length;
  const inlines = [];
  paragraph.forEach((child) => {
    if (remaining <= 0 || !child.isText) {
      inlines.push(child);
      return;
    }
    const text = child.text ?? '';
    if (text.length <= remaining) {
      remaining -= text.length;
      return;
    }
    inlines.push(schema.text(text.slice(remaining), child.marks));
    remaining = 0;
  });
  return paragraph.type.create(paragraph.attrs, inlines, paragraph.marks);
}

function convertBlockChildren(children, schema) {
  const nodes = [];
  let changed = false;
  for (const child of children) {
    if (isList(child)) {
      const result = convertList(child, schema);
      changed = changed || result.changed;
      nodes.push(...result.nodes);
      continue;
    }
    if (!child.isBlock || child.isTextblock || child.childCount === 0) {
      nodes.push(child);
      continue;
    }
    const inner = [];
    child.forEach((grandchild) => inner.push(grandchild));
    const result = convertBlockChildren(inner, schema);
    if (!result.changed) {
      nodes.push(child);
      continue;
    }
    changed = true;
    nodes.push(child.type.create(child.attrs, result.nodes, child.marks));
  }
  return { changed, nodes };
}

function convertItem(item, schema) {
  const first = item.firstChild;
  const marker = first && first.type.name === 'paragraph' ? leadingText(first).match(MARKER) : null;

  if (marker && first) {
    const rest = [];
    item.forEach((child, _offset, index) => {
      if (index > 0) rest.push(child);
    });
    const nested = convertBlockChildren(rest, schema);
    const checked = marker[1].toLowerCase() === 'x';
    const node = schema.nodes.taskItem.create({ checked }, [
      stripLeading(first, marker[0].length, schema),
      ...nested.nodes,
    ]);
    return { kind: 'task', checked, node };
  }

  const children = [];
  item.forEach((child) => children.push(child));
  const converted = convertBlockChildren(children, schema);
  if (!converted.changed) {
    return { kind: 'plain', node: item };
  }
  return { kind: 'plain', node: item.type.create(item.attrs, converted.nodes, item.marks) };
}

function convertList(list, schema) {
  const taskListType = schema.nodes.taskList;
  const taskItemType = schema.nodes.taskItem;
  if (!taskListType || !taskItemType) {
    return { changed: false, nodes: [list] };
  }

  const items = [];
  list.forEach((item) => items.push(convertItem(item, schema)));

  const hasTask = items.some((item) => item.kind === 'task');
  const nestedChanged = items.some(
    (item, index) => item.kind === 'plain' && item.node !== list.child(index),
  );
  if (!hasTask && !nestedChanged) {
    return { changed: false, nodes: [list] };
  }

  const nodes = [];
  let index = 0;
  while (index < items.length) {
    const kind = items[index].kind;
    const runStart = index;
    const run = [];
    while (index < items.length && items[index].kind === kind) {
      run.push(items[index].node);
      index += 1;
    }
    if (kind === 'task') {
      nodes.push(taskListType.create(null, run));
    } else {
      const attrs =
        list.type.name === 'orderedList'
          ? { ...list.attrs, start: (list.attrs.start ?? 1) + runStart }
          : list.attrs;
      nodes.push(list.type.create(attrs, run));
    }
  }
  return { changed: true, nodes };
}

function itemAt(nodes, itemIndex) {
  let remaining = itemIndex;
  for (const node of nodes) {
    if (remaining < node.childCount) return node.child(remaining);
    remaining -= node.childCount;
  }
  return null;
}

function itemOffset(nodes, itemIndex) {
  let remaining = itemIndex;
  let relative = 1;
  for (const node of nodes) {
    if (remaining < node.childCount) {
      for (let index = 0; index < remaining; index += 1) {
        relative += node.child(index).nodeSize;
      }
      return relative;
    }
    remaining -= node.childCount;
    relative += node.nodeSize;
  }
  return relative;
}

function findSelectionTarget(targets, from) {
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    const target = targets[targetIndex];
    if (from <= target.pos || from >= target.pos + target.size) continue;
    let itemPos = target.pos + 1;
    for (let itemIndex = 0; itemIndex < target.node.childCount; itemIndex += 1) {
      const item = target.node.child(itemIndex);
      if (from > itemPos && from < itemPos + item.nodeSize) {
        const paragraph = item.firstChild;
        if (!paragraph || paragraph.type.name !== 'paragraph') return null;
        const markerLength = (leadingText(paragraph).match(MARKER)?.[0] ?? '').length;
        return {
          targetIndex,
          itemIndex,
          offset: Math.max(0, from - (itemPos + 2)) - markerLength,
        };
      }
      itemPos += item.nodeSize;
    }
  }
  return null;
}

export default function activate(ctx) {
  const { Extension, Plugin, TextSelection, Fragment } = ctx.tiptap;
  const { TaskList, TaskItem } = ctx.tiptap.extensions;

  const TaskListTight = Extension.create({
    name: 'taskListTight',
    addGlobalAttributes() {
      return [
        {
          types: ['taskList'],
          attributes: {
            tight: {
              default: true,
              parseHTML: () => true,
              renderHTML: () => ({}),
            },
          },
        },
      ];
    },
  });

  const TaskListMarkdown = TaskList.extend({
    addStorage() {
      return {
        markdown: {
          serialize(state, node) {
            return state.renderList(
              node,
              '  ',
              () => `${this.editor.storage.markdown.options.bulletListMarker || '-'} `,
            );
          },
          parse: {
            setup() {},
            updateDOM() {},
          },
        },
      };
    },
  });

  const TaskListConversion = Extension.create({
    name: 'taskListConversion',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          appendTransaction: (transactions, _oldState, newState) => {
            if (!transactions.some((transaction) => transaction.docChanged)) return null;
            const schema = newState.schema;
            if (!schema.nodes.taskList || !schema.nodes.taskItem) return null;

            const targets = [];
            newState.doc.descendants((node, pos) => {
              if (isList(node)) {
                const result = convertList(node, schema);
                if (result.changed) {
                  targets.push({ pos, size: node.nodeSize, node, nodes: result.nodes });
                }
                return false;
              }
              return true;
            });
            if (targets.length === 0) return null;

            const selectionInfo = findSelectionTarget(targets, newState.selection.from);
            const tr = newState.tr;
            for (let index = targets.length - 1; index >= 0; index -= 1) {
              const target = targets[index];
              tr.replaceWith(target.pos, target.pos + target.size, Fragment.fromArray(target.nodes));
            }

            if (selectionInfo) {
              const target = targets[selectionInfo.targetIndex];
              const item = itemAt(target.nodes, selectionInfo.itemIndex);
              const paragraph = item?.firstChild;
              if (item && paragraph && paragraph.type.name === 'paragraph') {
                const offset = Math.min(Math.max(0, selectionInfo.offset), paragraph.content.size);
                const cursor = target.pos + itemOffset(target.nodes, selectionInfo.itemIndex) + 2 + offset;
                try {
                  tr.setSelection(TextSelection.create(tr.doc, cursor));
                } catch {
                  // keep ProseMirror default mapping
                }
              }
            }

            return tr.docChanged ? tr : null;
          },
        }),
      ];
    },
  });

  ctx.editor.registerExtensions([
    TaskListMarkdown,
    TaskItem.configure({ nested: true }),
    TaskListTight,
    TaskListConversion,
  ]);
}
