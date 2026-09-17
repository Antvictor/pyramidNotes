import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from 'react-i18next'

function NodeCustom({ data }) {
  const { t } = useTranslation()

  // 选中态由 MindMap 写进节点 data（不再订阅全局 context），
  // 这样选中变化只影响相关节点，而不是整图 30+ 个节点一起重渲染。
  const isSelected = !!data.isSelected
  const {
    hasHiddenChildren, descendantCount, isExpanded,
    onExpandOneLevel, onExpandAll, onCollapseNode,
  } = data;

  const showButtons = hasHiddenChildren || isExpanded;

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: isSelected ? '2px solid var(--link-color)' : '1px solid var(--border)',
        borderRadius: 4,
        cursor: 'pointer',
        minWidth: 40,
        maxWidth: 140,
        textAlign: 'center',
        color: 'var(--text-primary)',
        transition: 'border-color 0.2s, border-width 0.2s',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '6px 8px' }}>{data.name}</div>
      {showButtons && (
        <div style={{
          display: 'flex', alignItems: 'center',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-markdown)',
        }}>
          {isExpanded ? (
            <button
              onClick={(e) => { e.stopPropagation(); onCollapseNode?.(data.id); }}
              style={{
                flex: 1, padding: '2px 4px', fontSize: 9,
                border: 'none', background: 'transparent',
                color: 'var(--text-secondary)', cursor: 'pointer',
                lineHeight: '16px',
              }}
            >
              {t("mindMap.collapse")}
            </button>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onExpandOneLevel?.(data.id); }}
                style={{
                  flex: 1, padding: '2px 4px', fontSize: 9,
                  border: 'none', borderRight: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  lineHeight: '16px',
                }}
              >
                {t("mindMap.expand")}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onExpandAll?.(data.id); }}
                style={{
                  flex: 1, padding: '2px 4px', fontSize: 9,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  lineHeight: '16px',
                }}
              >
                {t("mindMap.expandAll")}
              </button>
            </>
          )}
          <span style={{
            fontSize: 9, color: 'var(--text-secondary)',
            opacity: 0.45, padding: '0 4px',
            borderLeft: '1px solid var(--border)',
            lineHeight: '16px',
            minWidth: 16, textAlign: 'center',
          }}>
            {descendantCount}
          </span>
        </div>
      )}
      <Handle id="top" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="left" type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="right" type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
    </div>
  )
}

// 只在 data 对象变化时重渲染。MindMap 重建 nodes 时会复用未变化节点的 data，
// 因此新建/移动/选中只会刷新真正变化的节点，而不是整图。
export default React.memo(NodeCustom, (a, b) => a.data === b.data)
