import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_COLORS } from './categoryColors'

// 卡片 overflow:hidden 且节点处于 ReactFlow transform 之下，
// 浮窗必须 portal 到 body + fixed 定位，否则会被裁剪或随 zoom 缩放。
function HoverCard({ anchor, interactive = false, onEnter, onLeave, children }) {
  if (!anchor) return null
  return createPortal(
    <div
      onMouseEnter={interactive ? onEnter : undefined}
      onMouseLeave={interactive ? onLeave : undefined}
      style={{
        position: 'fixed',
        left: anchor.x,
        top: anchor.y,
        maxWidth: 240,
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,.18)',
        padding: '8px 10px',
        fontSize: 12,
        lineHeight: 1.5,
        zIndex: 10000,
        pointerEvents: interactive ? 'auto' : 'none',
        userSelect: interactive ? 'text' : 'none',
        cursor: interactive ? 'text' : 'default',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

// 文件状态圆形图标（仅图标；hover 用 portal tooltip 显示原因；点击触发动作）。可用时返回 null。
// 简单模式放在独立状态行里；丰富模式并入顶栏（与色点同一行），不额外增高。
function StatusIcon({ availability, reason, nodeId, onAction }) {
  const { t } = useTranslation()
  const [tip, setTip] = useState(null)
  if (!availability || availability === 'available') return null
  const isMissing = availability === 'missing'
  const label = isMissing
    ? t('noteStatus.missing')
    : (reason === 'not_downloaded' ? t('noteStatus.notDownloaded') : t('noteStatus.unavailable'))
  const color = isMissing ? '#ef4444' : '#9ca3af'
  const glyph = isMissing ? '!' : (reason === 'not_downloaded' ? '⟳' : '!')

  return (
    <>
      <span
        onClick={(e) => { e.stopPropagation(); onAction?.(nodeId); }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setTip({ x: r.left, y: r.bottom + 6, text: label })
        }}
        onMouseLeave={() => setTip(null)}
        style={{
          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
          border: `1.5px solid ${color}`, color, fontSize: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {glyph}
      </span>
      <HoverCard anchor={tip}>{tip?.text}</HoverCard>
    </>
  )
}

// 轻量去除 markdown 标记，仅用于正文缩略
function stripMarkdown(s) {
  return String(s || '')
    .replace(/!\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, id, alias) => alias || id)
    .replace(/[#>*_`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function NodeCustom({ data }) {
  const { t } = useTranslation()

  const isSelected = !!data.isSelected
  const {
    hasHiddenChildren, descendantCount, isExpanded,
    onExpandOneLevel, onExpandAll, onCollapseNode,
  } = data

  const showButtons = hasHiddenChildren || isExpanded
  const rich = data.displayMode === 'rich'
  const truncate = !!data.nameTruncate
  const categoryColor = data.category ? CATEGORY_COLORS[data.category] : null
  const nodeWidth = data.nodeWidth ?? 140
  const showStatus = !!data.availability && data.availability !== 'available'

  const [nameTip, setNameTip] = useState(null)
  const [previewTip, setPreviewTip] = useState(null)
  const nameTimer = useRef(null)
  const previewShowTimer = useRef(null)
  const previewHideTimer = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(nameTimer.current)
      clearTimeout(previewShowTimer.current)
      clearTimeout(previewHideTimer.current)
    }
  }, [])

  const anchorBelow = (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.bottom + 6 }
  }

  const onNameEnter = (e) => {
    if (!truncate) return
    clearTimeout(nameTimer.current)
    const anchor = anchorBelow(e.currentTarget)
    nameTimer.current = setTimeout(() => {
      if (mountedRef.current) setNameTip({ ...anchor, text: data.name })
    }, 1000)
  }
  const onNameLeave = () => {
    clearTimeout(nameTimer.current)
    setNameTip(null)
  }

  const showPreviewPanel = async (anchor) => {
    const raw = await data.fetchPreview?.(data.id)
    if (!mountedRef.current) return
    const text = stripMarkdown(raw).slice(0, 200)
    setPreviewTip({ ...anchor, text: text || t('mindMap.noPreview') })
  }

  const onPreviewEnter = (e) => {
    clearTimeout(previewHideTimer.current)
    if (previewTip) return
    clearTimeout(previewShowTimer.current)
    const anchor = anchorBelow(e.currentTarget)
    previewShowTimer.current = setTimeout(() => showPreviewPanel(anchor), 1200)
  }
  const onPreviewLeave = () => {
    clearTimeout(previewShowTimer.current)
    clearTimeout(previewHideTimer.current)
    previewHideTimer.current = setTimeout(() => {
      if (mountedRef.current) setPreviewTip(null)
    }, 160)
  }
  const onPreviewPanelEnter = () => {
    clearTimeout(previewHideTimer.current)
  }
  const onPreviewPanelLeave = () => {
    if (mountedRef.current) setPreviewTip(null)
  }

  const iconButtonBase = {
    flex: 1, padding: '2px 4px', fontSize: 10,
    border: 'none', background: 'transparent',
    color: 'var(--text-secondary)', cursor: 'pointer',
    lineHeight: '16px',
  }

  return (
    <div
      style={{
        background: 'var(--mm-card-bg)',
        border: `1px solid ${isSelected ? 'var(--mm-selected)' : 'var(--mm-card-border)'}`,
        borderRadius: 6,
        boxShadow: isSelected ? 'var(--mm-selected-shadow)' : 'var(--mm-card-shadow)',
        cursor: 'pointer',
        minWidth: 40,
        maxWidth: nodeWidth,
        textAlign: 'center',
        color: 'var(--mm-node-text)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        overflow: 'hidden',
      }}
    >
      {!rich && showStatus && (
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '2px 6px',
          borderBottom: '1px solid var(--mm-card-border)',
          background: data.availability === 'missing' ? 'rgba(239,68,68,0.08)' : 'rgba(156,163,175,0.14)',
        }}>
          <StatusIcon
            availability={data.availability}
            reason={data.availability_reason}
            nodeId={data.id}
            onAction={data.onStatusAction}
          />
        </div>
      )}

      {rich && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '3px 6px',
          borderBottom: '1px solid var(--mm-card-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusIcon
              availability={data.availability}
              reason={data.availability_reason}
              nodeId={data.id}
              onAction={data.onStatusAction}
            />
            <button
              type="button"
              aria-label={t('nodeMenu.setCategory')}
              title={t('nodeMenu.setCategory')}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                data.onOpenColor?.(data.id, e.clientX, e.clientY)
              }}
              style={{
                width: 12, height: 12, padding: 0, borderRadius: '50%', cursor: 'pointer',
                border: categoryColor ? 'none' : '1.5px solid var(--text-secondary)',
                background: categoryColor || 'transparent',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="button"
            aria-label={t('mindMap.preview')}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseEnter={onPreviewEnter}
            onMouseLeave={onPreviewLeave}
            style={{
              border: 'none', background: 'transparent', cursor: 'help',
              padding: 0, fontSize: 11, lineHeight: 1, color: 'var(--text-secondary)',
            }}
          >
            📄
          </button>
        </div>
      )}

      <div
        style={{
          padding: '6px 8px',
          ...(truncate
            ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: nodeWidth - 20, margin: '0 auto' }
            : null),
        }}
        onMouseEnter={onNameEnter}
        onMouseLeave={onNameLeave}
      >
        {data.name}
      </div>

      {showButtons && (
        <div style={{
          display: 'flex', alignItems: 'center',
          borderTop: '1px solid var(--mm-card-border)',
          background: 'var(--mm-footer-bg)',
        }}>
          {isExpanded ? (
            <button
              aria-label={t('mindMap.collapse')}
              title={t('mindMap.collapse')}
              onClick={(e) => { e.stopPropagation(); onCollapseNode?.(data.id); }}
              style={iconButtonBase}
            >
              ▼
            </button>
          ) : (
            <>
              <button
                aria-label={t('mindMap.expand')}
                title={t('mindMap.expand')}
                onClick={(e) => { e.stopPropagation(); onExpandOneLevel?.(data.id); }}
                style={{ ...iconButtonBase, borderRight: '1px solid var(--mm-card-border)' }}
              >
                ▶
              </button>
              <button
                aria-label={t('mindMap.expandAll')}
                title={t('mindMap.expandAll')}
                onClick={(e) => { e.stopPropagation(); onExpandAll?.(data.id); }}
                style={iconButtonBase}
              >
                ▶▶
              </button>
            </>
          )}
          <span style={{
            fontSize: 9, color: 'var(--text-secondary)',
            opacity: 0.45, padding: '0 4px',
            borderLeft: '1px solid var(--mm-card-border)',
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

      <HoverCard anchor={nameTip}>{nameTip?.text}</HoverCard>
      <HoverCard
        anchor={previewTip}
        interactive
        onEnter={onPreviewPanelEnter}
        onLeave={onPreviewPanelLeave}
      >
        {previewTip?.text}
      </HoverCard>
    </div>
  )
}

// 只在 data 对象变化时重渲染。
export default React.memo(NodeCustom, (a, b) => a.data === b.data)
