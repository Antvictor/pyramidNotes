import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react'
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from 'react'
import DocEditor from '@/components/doc-editor'

export default function NotePage() {
  const router = useRouter()
  const { id } = router.query
  const [content, setContent] = useState('')
  const [yamlValue, setYamlValue] = useState<any>({})
  const [fileName, setFileName] = useState('')
  const [nodeName, setNodeName] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!id || typeof id !== 'string') return

    const loadFile = async () => {
      try {
        // id is already in format "nodeId-nodeName.md" from the navigation
        const actualFileName = id.endsWith('.md') ? id : `${id}.md`
        setFileName(actualFileName)

        // Extract node name for display if needed
        if (id.includes('-')) {
          const parts = id.split('-')
          const namePart = parts.slice(1).join('-').replace('.md', '')
          setNodeName(namePart)
        }

        // The IPC returns { data: yamlData, content: markdownContent }
        const result = await window.api.openFile(actualFileName)
        if (result) {
          const { data, content: markdownContent } = result
          setYamlValue(data || {})
          setContent(markdownContent || '')
          setReady(true)
        }
      } catch (error) {
        console.error('Failed to load file:', error)
      }
    }

    loadFile()
  }, [id])

  const handleChange = useCallback(async (markdownContent: string) => {
    if (!fileName || !id) return
    try {
      console.log('Saving file:', { fileName, contentLength: markdownContent.length })
      await window.api.saveFile(fileName, yamlValue, markdownContent, id)
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }, [fileName, id, yamlValue])

  if (!ready) {
    return (
      <div style={{ padding: 20, color: 'var(--text-primary)' }}>
        loading...
      </div>
    )
  }

  return (
    <div className="mx-8 pt-4 pb-10 md:mx-24 md:pb-24 lg:mx-40 xl:mx-80 2xl:mx-auto 2xl:max-w-4xl">
      <ProsemirrorAdapterProvider>
        <DocEditor content={content} onChange={handleChange} />
      </ProsemirrorAdapterProvider>
    </div>
  )
}