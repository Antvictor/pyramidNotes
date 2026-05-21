import '@/styles/globals.css'
import '@/styles/crepe.css'
import '@/styles/prosemirror.css'
import '@/styles/liquid.css'
import '@/styles/playground.css'
import '@/styles/variables.css'
import '@/styles/dark.css'
import '@milkdown/crepe/theme/common/style.css'
import type { AppProps } from 'next/app'
import Header from '@/components/header'
import Sidebar from '@/components/Sidebar'
import { LayoutProvider } from '@/providers'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LayoutProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar style={{ width: 60 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header />
          <main style={{ flex: 1, marginTop: 72, overflow: 'auto' }}>
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    </LayoutProvider>
  )
}