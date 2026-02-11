import React from 'react'
import { Handle, Position } from 'reactflow'
import { useNavigate } from 'react-router-dom'

export default function NodeCustom({ data }) {
  console.log(data);
  const navigate = useNavigate()
  return (
    <div
      style={{
        padding: 8,
        background: '#fff',
        border: '1px solid #888',
        borderRadius: 4,
        cursor: 'pointer',
        minWidth: 40, 
        maxWidth: 100,
        textAlign: 'center',
      }}
      onClick={() => navigate(`/note/${data.id}`)}
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
