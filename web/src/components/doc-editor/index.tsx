import { Crepe } from '@milkdown/crepe'
import { editorViewCtx, editorViewOptionsCtx } from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { outline } from '@milkdown/kit/utils'
import { eclipse } from '@uiw/codemirror-theme-eclipse'
import { useEffect, useRef, useState } from 'react'

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

  useEffect(() => {
    if (!divRef.current || loading.current) return
    loading.current = true
    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: content,
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
            setOutlines(outline()(ctx))
          })
          .markdownUpdated((ctx, markdown) => {
            const view = ctx.get(editorViewCtx)
            if (view.state?.doc) setOutlines(outline()(ctx))
            // Call onChange when content changes
            if (onChange && markdown) {
              onChange(markdown)
            }
          })
      })
      .use(iframePlugin)
      .use(listener)

    crepe.create().then(() => {
      loading.current = false
    })

    return () => {
      if (loading.current) return
      crepe.destroy()
    }
  }, [content, darkMode, onChange])

  return (
    <>
      <div className="crepe crepe-doc" ref={divRef} />
    </>
  )
}
