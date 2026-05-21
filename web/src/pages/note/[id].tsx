import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
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
        // The IPC returns { data: yamlData, content: markdownContent }
        const result = await window.api.openFile(id)
        if (result) {
          const { data, content: markdownContent } = result
          setYamlValue(data || {})
          setContent(markdownContent || '')

          // Extract node name from id (format: "nodeId-nodeName.md")
          // The id passed to router is actually the filename from MindMap
          if (typeof id === 'string' && id.includes('-')) {
            const parts = id.split('-')
            const nodeId = parts[0]
            const namePart = parts.slice(1).join('-').replace('.md', '')
            setNodeName(namePart)
            setFileName(`${nodeId}-${namePart}.md`)
          } else {
            setFileName(id)
          }

          setReady(true)
        }
      } catch (error) {
        console.error('Failed to load file:', error)
      }
    }

    loadFile()
  }, [id])

  const handleChange = async (markdownContent: string) => {
    if (!fileName || !id) return
    try {
      await window.api.saveFile(fileName, yamlValue, markdownContent, id)
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }

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