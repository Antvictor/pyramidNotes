import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { NodeSearchDialog } from '@/components/node-search'

interface SidebarProps {
  style?: React.CSSProperties
}

const Sidebar = ({ style }: SidebarProps) => {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)

  const isActive = (path: string) => router.pathname === path

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div
        style={{
          width: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 16,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          ...style,
        }}
      >
        <button
          onClick={() => setSearchOpen(true)}
          style={{
            color: 'var(--text-primary)',
            fontSize: 20,
            padding: '8px 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Search"
        >
          🔍
        </button>
        <Link
          href="/"
          style={{
            color: isActive('/') ? 'var(--accent)' : 'var(--text-primary)',
            fontSize: 20,
            padding: '8px 0',
            textDecoration: 'none',
          }}
        >
          🗺️
        </Link>
        <Link
          href="/settings"
          style={{
            color: isActive('/settings') ? 'var(--accent)' : 'var(--text-primary)',
            fontSize: 20,
            padding: '8px 0',
            textDecoration: 'none',
          }}
        >
          ⚙️
        </Link>
      </div>
      <NodeSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}

export default Sidebar