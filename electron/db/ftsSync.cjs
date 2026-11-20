'use strict';

// notes_fts 的日常增删改由 notes_ai / notes_au / notes_ad 触发器维护。
// 全量回填只在两种情况下需要：
//   1. 索引表本次刚创建（历史库升级、损坏重建）——触发器不会回填已有行；
//   2. 行数与 notes 不一致——历史脏数据或触发器曾缺失的兜底修复。
// 正常启动两者都不成立，必须跳过重建：FTS 全量重建是 O(正文总量)，
// 且发生在窗口创建之前（5000 篇约 2.8s）。
function shouldRebuildFts({ hadFts, notesCount, ftsCount }) {
  if (!hadFts) return notesCount > 0;
  return notesCount !== ftsCount;
}

module.exports = { shouldRebuildFts };
