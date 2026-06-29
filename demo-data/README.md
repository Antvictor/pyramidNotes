# Demo Data for Pyramid Notes

This directory contains bilingual demo workspaces for Pyramid Notes.

## Contents

| Directory | Language | Theme | Nodes |
|-----------|----------|-------|-------|
| `zh/` | 简体中文 | 操作系统学习笔记 | 12 |
| `en/` | English | Distributed Systems Notes | 12 |

## Quick Start

### Install Demo Data

```bash
# Install both Chinese and English demo data
./install.sh ~/Documents/pyramidNotes-demo both

# Or install only one language
./install.sh /tmp/pn-demo zh
./install.sh /tmp/pn-demo en
```

### Use in Pyramid Notes

1. Open Pyramid Notes
2. Go to **Settings** (⚙️)
3. Change **Storage Path** to the target directory (e.g., `~/Documents/pyramidNotes-demo`)
4. The app will reload and display the demo mind map

### Clean Up

```bash
# Remove demo data files from a directory
./cleanup.sh ~/Documents/pyramidNotes-demo
```

**Note:** `cleanup.sh` only removes files that belong to the demo datasets. It will not touch your real notes.

## Demo Data Structure

### Chinese Demo (操作系统学习笔记)

```
操作系统
├── 进程管理
│   ├── 进程调度算法
│   └── 进程间通信
├── 内存管理
│   ├── 虚拟内存
│   └── 分页与分段
├── 文件系统
│   ├── inode 结构
│   └── 日志文件系统
└── 设备管理
    └── I/O 模型
```

### English Demo (Distributed Systems Notes)

```
Distributed Systems
├── Consensus Algorithms
│   ├── Paxos
│   └── Raft
├── CAP Theorem
├── Distributed Transactions
│   ├── Two-Phase Commit
│   └── Saga Pattern
├── Replication
│   ├── Leader-Follower
│   └── Multi-Leader
└── Consistency Models
```

## Verification Checklist

- [ ] App loads all nodes in the mind map
- [ ] Parent-child relationships are correct
- [ ] Node search works (try "调度" or "consensus")
- [ ] Full-text search returns results with snippets
- [ ] Creating, renaming, moving, and deleting nodes works
- [ ] Language switching preserves content (node names are not translated)
- [ ] Double-clicking a leaf node opens the Markdown editor with full content
