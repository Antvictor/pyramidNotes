import type { FC } from 'react'
import { useSetDarkMode, useDarkMode } from '@/providers'

const Header: FC = () => {
  const darkMode = useDarkMode()
  const setDarkMode = useSetDarkMode()

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-[72px] items-center justify-end border-b border-[var(--border)] bg-[var(--background)] px-4">
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="rounded-lg p-2 hover:bg-[var(--hover)]"
        aria-label="Toggle dark mode"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
    </header>
  )
}

export default Header