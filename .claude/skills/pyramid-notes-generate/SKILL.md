---
name: pyramid-notes-generate
description: 生成 pyramidNotes 兼容的 Markdown 文件，包含正确的 YAML frontmatter（id/title/top/left/alias），文件名格式为 {id}-{title}.md，可被 App 自动加载。
---

# Pyramid Notes 文件生成器

生成可被 pyramidNotes App 启动时自动扫描加载的 Markdown 文件。

## 文件命名规则

```
{id}-{title}.md
```

- `{id}`：12位随机小写字母+数字混合（如 `a1b2c3d4e5f6`）
- `{title}`：文章标题，空格替换为 `-`，移除 `# / \ : * ? " < > |` 等非法字符

示例：`a1b2c3d4e5f6-操作系统概述.md`

## YAML Frontmatter 格式

```yaml
---
id: a1b2c3d4e5f6
title: 文章标题
top: 1
left: ''
alias: ''
---
```

### 字段规则

| 字段 | 规则 |
|------|------|
| `id` | 12位随机字母+数字（a-z, 0-9），**不加引号** |
| `title` | 文章标题，与文件名中的 title 一致 |
| `top` | 有父节点时填父节点ID（字符串），无父节点填 `1`（数字），**不加引号** |
| `left` | 固定 `''` |
| `alias` | 固定 `''` |

## 生成流程

1. **确认主题**：向用户确认文章主题、标题、大致内容
2. **确认层级**：是否有父节点？有则获取父节点ID填入 `top`，无则 `top: 1`
3. **生成ID**：随机生成12位小写字母+数字组合（使用 `crypto.randomUUID` 截取或手动随机）
4. **生成文件**：按上述格式创建 `.md` 文件，保存到 pyramidNotes 存储目录（默认 `~/Documents/pyramidNotes/`）
5. **加载**：重启 App 后 `initNode()` 自动扫描目录，解析 YAML，将新文件 INSERT 到数据库

## 完整示例

文件 `a1b2c3d4e5f6-操作系统概述.md`：

```markdown
---
id: a1b2c3d4e5f6
title: 操作系统概述
top: 1
left: ''
alias: ''
---

# 操作系统概述

操作系统是管理计算机硬件与软件资源的系统软件。

## 主要功能

- 进程管理
- 内存管理
- 文件系统
- 设备管理

## 常见操作系统

- Linux
- Windows
- macOS
```

## 子节点示例

如果「进程管理」是「操作系统概述」的子节点：

文件 `b2c3d4e5f6a7-进程管理.md`：

```markdown
---
id: b2c3d4e5f6a7
title: 进程管理
top: a1b2c3d4e5f6
left: ''
alias: ''
---

# 进程管理

进程是正在运行的程序的实例。
```

## 注意事项

- **ID 必须唯一**，每次生成前确认不与已有文件重复
- 文件名和 frontmatter 中的 `title` 应保持一致
- `top` 为 `1` 表示根节点，字符串表示子节点（指向父节点ID）
- App 的 `initNode()` 只扫描 `.md` 文件，通过 frontmatter 中的 `id` 匹配数据库记录
- 文件放在存储目录根级别即可，不支持子目录扫描
