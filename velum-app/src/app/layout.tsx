import './globals.css'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#141416',
}

export const metadata: Metadata = {
  title: 'Velum - Personal Assistant',
  description: 'Your AI-powered personal assistant for nutrition, coaching, and life admin',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Velum',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* Version marker - if you see this, new code deployed */}
        <div style={{position: 'fixed', bottom: 4, right: 4, fontSize: '10px', color: '#999', zIndex: 9999}}>
          v2026-02-06-RESPONSIVE
        </div>
        {children}
      </body>
    </html>
  )
}
