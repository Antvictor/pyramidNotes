import { useRouter } from 'next/router'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import NodeCustom from '@/components/NodeCustom'
import db from '@/lib/db'
import ContextMenu from '@/components/ContextMenu'
import OpenPrompt from './commons/OpenPrompt'
import { nanoid } from 'nanoid'

const nodeTypes = { custom: NodeCustom }

function layoutTree(nodes, rootId, startX, startY, levelGap = 110) {
  const NODE_MIN_WIDTH = 30
  const H_GAP = 40

  const nodeMap = new Map()
  nodes.forEach((n) => nodeMap.set(n.id, { ...n, children: [] }))
  nodes.forEach((n) => {
    if (n.top && n.top !== '0') nodeMap.get(n.top)?.children.push(nodeMap.get(n.id))
  })

  const widthMap = new Map()
  const positions = new Map()

  const getNodeWidth = (node) => {
    const text = `${node?.name ?? ''}`
    const estimated = Math.min(220, NODE_MIN_WIDTH + text.length * 8)
    return Math.max(NODE_MIN_WIDTH, estimated)
  }

  const calcWidth = (node) => {
    const children = node.children || []
    const selfWidth = getNodeWidth(node)
    if (!children.length) {
      widthMap.set(node.id, selfWidth)
      return selfWidth
    }
    const childWidths = children.map(calcWidth)
    const childrenTotal =
      childWidths.reduce((sum, w) => sum + w, 0) + H_GAP * Math.max(0, children.length - 1)
    const subtreeWidth = Math.max(selfWidth, childrenTotal)
    widthMap.set(node.id, subtreeWidth)
    return subtreeWidth
  }

  const place = (node, depth, centerX) => {
    const y = startY + depth * levelGap
    positions.set(node.id, { x: centerX, y })

    const children = node.children || []
    if (!children.length) return

    const subtreeWidth = widthMap.get(node.id) ?? getNodeWidth(node)
    let cursorLeft = centerX - subtreeWidth / 2

    children.forEach((child) => {
      const w = widthMap.get(child.id) ?? getNodeWidth(child)
      const childCenterX = cursorLeft + w / 2
      place(child, depth + 1, childCenterX)
      cursorLeft += w + H_GAP
    })
  }

  const rootNode = nodeMap.get(rootId)
  if (rootNode) {
    calcWidth(rootNode)
    place(rootNode, 0, startX)
  }

  return positions
}

export default function MindMap() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [notesData, setNotesData] = useState(null)
  const [visible, setVisible] = useState(false)
  const [nodeAction, setNodeAction] = useState<(() => void) | undefined>()
  const [nodeId, setNodeId] = useState()
  const [title, setTitle] = useState()
  const [menu, setMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    type: '',
    nodeId: '1',
    title: '',
  })

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const memoNodeTypes = useMemo(() => nodeTypes, [])

  useEffect(() => {
    db.notes.select().then((res) => {
      if (!res || res.length === 0) {
        const rootNode = { id: '1', name: 'root', content: '', alias: '', top: '0', left: '0' }
        db.notes.insert(rootNode)
        saveNode(rootNode)
        setNotesData([rootNode])
      } else {
        setNotesData(res)
      }
    })
  }, [])

  useEffect(() => {
    if (window.api?.onSettingsChanged) {
      window.api.onSettingsChanged(() => {
        db.notes.select().then((res) => {
          if (res && res.length > 0) setNotesData(res)
        })
      })
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('search') === '1') {
      // Handle search - future enhancement
    }
  }, [searchParams])

  useEffect(() => {
    if (!notesData) return
    const rootNode = notesData.find((n) => '0' === n.top)
    const rootId = rootNode?.id
    const posMap = layoutTree(notesData, rootId, 50, 50)

    const initNodes = notesData.map((n) => ({
      id: n.id,
      type: 'custom',
      data: { name: n.name, label: n.name, ...n },
      position: posMap.get(n.id),
    }))

    const initEdges: any[] = []
    notesData.forEach((e) => {
      if (e.top && e.top !== '0') {
        initEdges.push({
          id: `e${e.top}-${e.id}`,
          source: e.top,
          sourceHandle: 'bottom',
          target: e.id,
          targetHandle: 'top',
          style: { stroke: 'var(--link-color)', strokeWidth: 2 },
        })
      }
      if (e.left) {
        initEdges.push({
          id: `e${e.left}-${e.id}`,
          source: e.left,
          sourceHandle: 'right',
          target: e.id,
          targetHandle: 'left',
          style: { stroke: 'var(--link-color)', strokeWidth: 2 },
        })
      }
    })

    setNodes(initNodes)
    setEdges(initEdges)
  }, [notesData, setEdges, setNodes])

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleFileError = (result: any) => {
    if (result?.error) return true
    return false
  }

  const saveNode = async (node: any) => {
    const yamlStr = { id: node.id, alias: '', title: node.name, left: node.left, top: node.top }
    await window.api.saveFile(`${node.id}-${node.name}.md`, yamlStr, '', node.id)
  }

  const onPaneContextMenu = useCallback((e: any) => {
    e.preventDefault()
    setMenu({ show: true, x: e.clientX, y: e.clientY, type: 'pane', nodeId: '1', title: '' })
  }, [])

  const onNodeContextMenu = useCallback((e: any, node: any) => {
    e.preventDefault()
    setMenu({ show: true, x: e.clientX, y: e.clientY, type: 'node', nodeId: node.id, title: node.data.name })
  }, [])

  const closeMenu = () => setMenu((m) => ({ ...m, show: false }))

  const addNewNode = (id: string) => {
    setVisible(true)
    setNodeId(id)
    setTitle('')
    setNodeAction(() => insertNode)
  }

  const insertNode = useCallback((parent: string, name: string) => {
    setVisible(false)
    const id = nanoid(12)
    const newNodeDb = { id: `${id}`, name: `${name}`, content: '', alias: '', top: `${parent}`, left: '' }
    db.notes.insert(newNodeDb)
    saveNode(newNodeDb)
    setNotesData((prevData) => [...(prevData || []), newNodeDb])
  }, [])

  const updateNode = (id: string, noteTitle: string) => {
    setVisible(true)
    setNodeId(id)
    setTitle(noteTitle)
    setNodeAction(() => editNode)
  }

  const editNode = useCallback(async (id: string, name: string, orginName: string) => {
    setVisible(false)
    db.notes.update({ id }, { name })
    setNotesData((nds) => nds.map((n) => (n.id === id ? { ...n, name } : n)))
    await window.api.renameFile(`${id}-${orginName}.md`, `${id}-${name}.md`)
    await window.api.updateYaml(`${id}-${name}.md`, { title: name })
  }, [])

  const deleteNode = (id: string, noteTitle: string) => {
    setNotesData((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    db.notes.delete({ id })
    window.api.deleteFile(`${id}-${noteTitle}.md`)
  }

  const handleNodeClick = useCallback(
    (_: any, node: any) => {
      const fileName = `${node.id}-${node.data.name}.md`
      router.push(`/note/${fileName}`)
    },
    [router]
  )

  return (
    <div style={{ width: '90vw', height: '94vh', background: 'var(--background)' }}>
      <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={memoNodeTypes}
          nodesConnectable={false}
          defaultEdgeOptions={{ type: 'smoothstep', selectable: false, style: { stroke: 'var(--link-color)', strokeWidth: 2 } }}
          fitView
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          nodesDraggable={false}
          panOnScroll={false}
          zoomOnScroll={true}
          panOnDrag={true}
          attributionPosition={null}
          onEdgesDelete={() => {}}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
          onNodeClick={handleNodeClick}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <ContextMenu
          menu={menu}
          onClose={closeMenu}
          onCreateNode={addNewNode}
          onEditNode={updateNode}
          onDeleteNode={deleteNode}
        />
        <OpenPrompt
          visible={visible}
          id={nodeId}
          title={title}
          onOk={nodeAction}
          onCancel={() => setVisible(false)}
        />
      </div>
  )
}