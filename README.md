# Pyramid Notes

[English](#english) | [中文](#chinese)

---

<a id="english"></a>

## Pyramid Notes

A mind-map note-taking tool that combines structured outlining with Markdown editing. Build your knowledge system visually — each node in the tree is a full Markdown document.

### Features

- **Mind Map View** — Tree layout with automatic positioning, visualize your knowledge hierarchy
- **Markdown Editor** — Powered by TiPTap, with code highlighting, headings, and lists
- **Node Management** — Create, rename, delete, and move nodes with cycle detection
- **Full-Text Search** — FTS5 with Chinese word segmentation, search by node name or content
- **Customizable Shortcuts** — Global keyboard shortcuts, fully configurable
- **Dark Mode** — Follows system theme
- **Cross-Platform** — macOS (Intel + Apple Silicon) and Windows (x64 + x32)

### Shortcuts

#### Mind Map

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New child node |
| `F2` | Rename selected node |
| `Delete` | Delete selected node |
| `Ctrl+K` | Open search |
| `Escape` | Deselect / close search |
| Double-click node | Open in editor |

#### Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+1` | Heading 1 |
| `Ctrl+2` | Heading 2 |
| `Escape` | Back to mind map |

#### Mouse

| Action | Result |
|--------|--------|
| Single click node | Select node |
| Double click node | Open editor |
| Right click node | Context menu (create / rename / move / delete) |
| Right click blank area | Create root-level node |

### Usage

#### Open a note
Double-click any node in the mind map to open its Markdown editor. Press `Escape` to return.

#### Move a node
Right-click a node → "Move" → search for the target parent node → select to confirm. The node and its subtree will be relocated.

#### Search
Press `Ctrl+K` to open the search dialog. Two modes available:
- **Node Search** — find nodes by name
- **Full-Text Search** — search inside note content

#### Customize shortcuts
Open Settings (gear icon) → Shortcuts. Click any shortcut to rebind it.

---

<a id="chinese"></a>

## Pyramid Notes（金字塔笔记）

一款将思维导图与 Markdown 编辑融为一体的笔记工具。树状结构从上到下展开，每个节点点进去就是一篇 Markdown——让知识从一个根开始，自然生长成体系。

### 功能

- **思维导图视图** — 树形布局自动计算位置，知识层级一目了然
- **Markdown 编辑器** — 基于 TiPTap，支持代码高亮、标题、列表
- **节点管理** — 创建、重命名、删除、移动，移动时自动防循环引用
- **全文搜索** — FTS5 + 中文分词，支持节点名称和内容全文检索
- **可配置快捷键** — 全局快捷键，可自定义
- **暗色模式** — 跟随系统主题
- **跨平台** — macOS (Intel + Apple Silicon) 和 Windows (x64 + x32)

### 快捷键

#### 思维导图

| 快捷键 | 操作 |
|--------|------|
| `Ctrl+N` | 新建子节点 |
| `F2` | 重命名选中节点 |
| `Delete` | 删除选中节点 |
| `Ctrl+K` | 打开搜索 |
| `Escape` | 取消选中 / 关闭搜索 |
| 双击节点 | 进入编辑器 |

#### 编辑器

| 快捷键 | 操作 |
|--------|------|
| `Ctrl+B` | 加粗 |
| `Ctrl+I` | 斜体 |
| `Ctrl+1` | 一级标题 |
| `Ctrl+2` | 二级标题 |
| `Escape` | 返回思维导图 |

#### 鼠标操作

| 操作 | 效果 |
|------|------|
| 单击节点 | 选中节点 |
| 双击节点 | 进入编辑器 |
| 右键节点 | 弹出菜单（创建 / 重命名 / 移动 / 删除） |
| 右键空白区域 | 创建根级节点 |

### 使用说明

#### 打开笔记
双击思维导图中的节点进入 Markdown 编辑器。按 `Escape` 返回。

#### 移动节点
右键节点 → 选择"移动" → 搜索目标父节点 → 选中确认。节点及其子节点将被整体移动。

#### 搜索
按 `Ctrl+K` 打开搜索框，支持两种模式：
- **节点搜索** — 按名称查找节点
- **全文搜索** — 搜索笔记内容

#### 自定义快捷键
打开设置（齿轮图标）→ 快捷键，点击任意快捷键即可重新绑定。

---

### Tech Stack

Electron · React · ReactFlow · TiPTap · SQLite (FTS5)
