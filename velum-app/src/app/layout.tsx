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
      <body>{children}</body>
    </html>
  )
}
