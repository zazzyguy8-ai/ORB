import type { Metadata } from 'next'

/**
 * The DIRE ORB experience.
 *
 * A route group, so these pages keep their URLs (/orb, /questions, /result,
 * /daily, /reading) while carrying their own chrome and metadata. The violet
 * scanline and vignette belong to this product only — CULTSCAN at the root
 * shares the deployment with it and nothing else.
 */

export const metadata: Metadata = {
  title: 'DIRE ORB',
  description: 'The orb already remembers you.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DIRE ORB',
  },
  openGraph: {
    title: 'DIRE ORB',
    description: 'An ancient intelligence reads the hidden architecture of your soul.',
    type: 'website',
  },
}

export default function OrbLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="scanline" />
      <div className="vignette" />
      {children}
    </>
  )
}
