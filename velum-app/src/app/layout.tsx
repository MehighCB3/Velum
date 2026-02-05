import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Velum - Personal Assistant',
  description: 'Your AI-powered personal assistant for nutrition, coaching, and life admin',
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
          v2026-02-05-URL-ROUTING
        </div>
        {children}
      </body>
    </html>
  )
}
