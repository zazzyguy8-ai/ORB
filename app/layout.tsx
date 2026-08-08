import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['100', '200', '300', '400'],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['normal', 'italic'],
  weight: ['400', '700'],
})

/**
 * Root metadata describes CULTSCAN, which owns `/`. The DIRE ORB pages carry
 * their own metadata from the (orb) route group and override this.
 */
export const metadata: Metadata = {
  title: 'CULTSCAN — narrative survivability for memecoins',
  description:
    'Every other tool checks the contract. CULTSCAN scores whether the story survives a group chat, a red candle, and week two.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'CULTSCAN',
    description:
      'Contract safety is solved. Narrative survivability is not. Score the thing people actually decide on.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#07090A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-black min-h-screen overflow-x-hidden">{children}</body>
    </html>
  )
}
