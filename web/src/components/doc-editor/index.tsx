import { Crepe } from '@milkdown/crepe'
import { editorViewCtx, editorViewOptionsCtx } from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { outline } from '@milkdown/kit/utils'
import { eclipse } from '@uiw/codemirror-theme-eclipse'
import { useEffect, useRef, useState, useCallback } from 'react'

import { useDarkMode } from '@/providers'
import { iframePlugin } from './iframePlugin'

interface DocEditorProps {
  content: string
  onChange?: (content: string) => void
  url?: string
}

export default function DocEditor({ content, onChange, url }: DocEditorProps) {
  const [outlines, setOutlines] = useState<
    { text: string; level: number; id: string }[]
  >([])
  const darkMode = useDarkMode()
  const divRef = useRef<HTMLDivElement>(null)
  const loading = useRef(false)
  const crepeRef = useRef<Crepe | null>(null)
  const contentRef = useRef(content)
  const mountedRef = useRef(true)

  // Sync content to ref to avoid stale closure
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Memoize onChange to prevent effect re-runs
  const handleChangeRef = useRef(onChange)
  useEffect(() => {
    handleChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!divRef.current || loading.current) return

    loading.current = true
    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: contentRef.current,
      features: {
        [Crepe.Feature.BlockEdit]: false,
        [Crepe.Feature.Latex]: false,
      },
      featureConfigs: {
        [Crepe.Feature.CodeMirror]: {
          theme: darkMode ? undefined : eclipse,
        },
      },
    })

    crepeRef.current = crepe
    const editor = crepe.editor

    editor
      .config((ctx) => {
        ctx.set(editorViewOptionsCtx, {
          attributes: {
            class: 'w-full max-w-full box-border p-4',
            spellcheck: 'false',
          },
        })

        ctx
          .get(listenerCtx)
          .mounted((ctx) => {
            if (mountedRef.current) {
              setOutlines(outline()(ctx))
            }
          })
          .markdownUpdated((ctx, markdown) => {
            const view = ctx.get(editorViewCtx)
            if (view.state?.doc && mountedRef.current) {
              setOutlines(outline()(ctx))
            }
            // Call onChange when content changes
            if (handleChangeRef.current && markdown) {
              handleChangeRef.current(markdown)
            }
          })
      })
      .use(iframePlugin)
      .use(listener)

    crepe.create().then(() => {
      loading.current = false
    })

    return () => {
      // Always destroy, don't skip based on loading.current
      if (crepeRef.current) {
        crepeRef.current.destroy()
        crepeRef.current = null
      }
      loading.current = false
    }
  }, [darkMode]) // Only re-init when darkMode changes, not content or onChange

  return (
    <>
      <div className="crepe crepe-doc" ref={divRef} />
    </>
  )
}
