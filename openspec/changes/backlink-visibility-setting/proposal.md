# 反链面板显隐设置

## Why

反链面板目前始终显示，用户无法按偏好隐藏。

## What Changes

- 设置页「编辑器设置」新增「反链面板」开关（显示/隐藏），设置键 `showBacklinks`，默认显示
- 笔记页底部反链面板按该设置显隐，实时生效（走既有 saveSettings 广播 + onSettingsChanged 链路）
- electron IPC 层、TipTapEditor、MindMap 零改动

## Capabilities

### Modified Capabilities

- `internal-node-links`: Backlink panel 需求增加显隐设置场景
