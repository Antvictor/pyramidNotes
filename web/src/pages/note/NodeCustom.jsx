import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { useSelectedNode } from '../../contexts/SelectedNodeContext'

export default function NodeCustom({ data }) {
  const { selectedNode } = useSelectedNode()

  const isSelected = selectedNode && selectedNode.id === data.id

  return (
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
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}
