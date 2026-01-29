import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Archie - Your AI Companion',
  description: 'Your AI companion for nutrition, coaching, and life. Built by Mihai to help you move mountains, subtly.',
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
