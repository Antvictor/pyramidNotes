import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { useRouter } from 'next/router'

export default function NodeCustom({ data }) {
  console.log(data)
  const router = useRouter()
  return (
    <div
      style={{
        padding: 8,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        cursor: 'pointer',
        minWidth: 40,
        maxWidth: 100,
        textAlign: 'center',
        color: 'var(--text-primary)',
      }}
      onClick={() => router.push(`/note/${data.id}-${data.name}.md`)}
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
