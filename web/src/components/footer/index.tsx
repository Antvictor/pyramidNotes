import type { FC } from 'react'

const Footer: FC = () => {
  return (
    <footer className="flex w-full items-center justify-center border-t border-[var(--border)] py-4 text-sm text-[var(--text-secondary)]">
      <span>PyramidNotes © 2024</span>
    </footer>
  )
}

export default Footer