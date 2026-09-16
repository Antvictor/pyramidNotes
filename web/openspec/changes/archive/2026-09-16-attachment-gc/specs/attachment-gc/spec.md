# attachment-gc Specification

## Purpose

清理没有任何笔记引用的附件图片（含历史孤儿），避免图片无限占用磁盘；
同时保证共享图片、回收站笔记的图片不被误删。

## Requirements

### Requirement: 清理无人引用的图片

系统 SHALL 能识别 `{storagePath}/attachment/img/` 下**没有任何笔记引用**的文件并删除它们。

判定「被引用」SHALL 依据笔记内容中的本地图片引用 `![[文件名.ext]]`，
SHALL NOT 依据文件名前缀等其它推断方式。

### Requirement: 引用扫描的范围

引用集合 SHALL 来自**全部** `notes` 记录，**包括 `delete=1`**（回收站）的笔记。

### Requirement: 清理时机

系统 SHALL 在**应用启动**时执行清理，SHALL 在**永久删除笔记之后**执行清理
（`deleteNotes` 非 `trash` 模式、`purgeTrashNodes`、`purgeExpiredTrash`）。

系统 SHALL NOT 在编辑器保存（`saveFile`）路径上执行清理。

### Requirement: 回收站不丢图

笔记处于回收站（`delete=1`）期间，其图片 SHALL NOT 被清理；
该笔记恢复后，其图片 SHALL 仍可正常显示。

### Requirement: 节点嵌入不被误判

`![[...]]` 同时用于图片与节点嵌入，引用提取 SHALL 仅收集以**图片扩展名**
（png/jpg/jpeg/gif/webp/bmp/svg）结尾的引用。

### Requirement: 清理失败不影响主流程

清理过程中的异常 SHALL 被捕获并记录，SHALL NOT 导致应用启动失败或笔记删除失败。

### Requirement: 只删除目标目录的直接子文件

清理 SHALL 仅删除 `attachment/img/` 下的直接子文件，SHALL NOT 递归删除子目录，
且 SHALL 校验路径未越出该目录。
