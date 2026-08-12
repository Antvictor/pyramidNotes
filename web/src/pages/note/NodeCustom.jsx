import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { useSelectedNode } from '../../contexts/SelectedNodeContext'
import { useTranslation } from 'react-i18next'

export default function NodeCustom({ data }) {
  const { selectedNode } = useSelectedNode()
  const { t } = useTranslation()

  const isSelected = selectedNode && selectedNode.id === data.id
  const {
    hasHiddenChildren, descendantCount, isExpanded,
    onExpandOneLevel, onExpandAll, onCollapseNode,
  } = data;

  const btnBase = {
    padding: '0px 4px',
    fontSize: 9,
    borderRadius: 2,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    lineHeight: '14px',
    opacity: 0.55,
  };

  const showButtons = hasHiddenChildren || isExpanded;

  return (
    <div
      style={{
        padding: '6px 8px',
        background: 'var(--bg-primary)',
        border: isSelected ? '2px solid var(--link-color)' : '1px solid var(--border)',
        borderRadius: 4,
        cursor: 'pointer',
        minWidth: 40,
        maxWidth: 100,
        textAlign: 'center',
        color: 'var(--text-primary)',
        transition: 'border-color 0.2s, border-width 0.2s',
      }}
    >
      <div style={{ marginBottom: showButtons ? 2 : 0 }}>{data.name}</div>
      {showButtons && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          justifyContent: 'center', flexWrap: 'nowrap',
          borderTop: '1px solid var(--border)',
          paddingTop: 2,
          opacity: 0.7,
        }}>
          {isExpanded ? (
            <button
              onClick={(e) => { e.stopPropagation(); onCollapseNode?.(data.id); }}
              style={btnBase}
            >
              {t("mindMap.collapse")}
            </button>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onExpandOneLevel?.(data.id); }}
                style={btnBase}
              >
                {t("mindMap.expand")}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onExpandAll?.(data.id); }}
                style={btnBase}
              >
                {t("mindMap.expandAll")}
              </button>
            </>
          )}
          <span style={{
            fontSize: 9, color: 'var(--text-secondary)', opacity: 0.45,
            marginLeft: 1, whiteSpace: 'nowrap',
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
