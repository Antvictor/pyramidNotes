import Link from 'next/link'
import { useRouter } from 'next/router'

interface SidebarProps {
  style?: React.CSSProperties
}

const Sidebar = ({ style }: SidebarProps) => {
  const router = useRouter()

  const isActive = (path: string) => router.pathname === path

  return (
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
  )
}

export default Sidebar