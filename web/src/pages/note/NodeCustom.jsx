import React from 'react'
import { Handle, Position, NodeToolbar } from '@xyflow/react'
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
    background: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    lineHeight: '14px',
    opacity: 0.7,
  };

  const showButtons = hasHiddenChildren || isExpanded;

  return (
    <>
      <div
        style={{
          padding: 8,
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
        {data.name}
        <Handle id="top" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
        <Handle id="left" type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
        <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
        <Handle id="right" type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
      </div>
      {showButtons && (
        <NodeToolbar position={Position.Bottom} align="center" offset={6} isVisible={true}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            justifyContent: 'center', flexWrap: 'nowrap',
            background: 'var(--bg-primary)',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            position: 'relative',
            zIndex: 1000,
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
              fontSize: 9, color: 'var(--text-secondary)', opacity: 0.5,
              marginLeft: 1, whiteSpace: 'nowrap',
            }}>
              {descendantCount}
            </span>
          </div>
        </NodeToolbar>
      )}
    </>
  )
}
