'use strict';

// 启动对账与渲染端写入的互斥闸门：对账在计划阶段会读取「文件 + 数据库」快照，
// 若此刻渲染端正新建节点（先写库、后写文件），该行会被当作「无文件的孤儿」硬删除。
// 让非 SELECT 的 dbQuery 等待在途对账结束，即可消除这个竞态。
let pending = null;

function setWriteGate(promise) {
  pending = promise || null;
}

async function waitForWriteGate() {
  const current = pending;
  if (!current) return;
  try {
    await current;
  } catch {
    // 对账失败也要放行写入，窗口要保持可用
  }
}

module.exports = { setWriteGate, waitForWriteGate };
