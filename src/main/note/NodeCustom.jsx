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
        minWidth: 120,
        textAlign: 'center',
      }}
      onClick={() => navigate(`/note/${data.id}`)}
    >
      {data.label}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
