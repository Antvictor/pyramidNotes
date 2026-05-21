import type { FC, ReactNode } from 'react'

// PyramidNotes doesn't use Algolia DocSearch, so this is a stub provider
export const DocSearchProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>
}