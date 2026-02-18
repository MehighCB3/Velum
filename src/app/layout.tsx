import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Velum - Personal Wellness Companion',
  description: 'Track nutrition, fitness, budget, and life goals. Built by Mihai.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
