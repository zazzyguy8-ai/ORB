import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CULTSCAN — narrative survivability for memecoins',
  description:
    'Every other tool checks the contract. CULTSCAN scores whether the story survives a group chat, a red candle, and week two.',
  openGraph: {
    title: 'CULTSCAN',
    description:
      'Contract safety is solved. Narrative survivability is not. Score the thing people actually decide on.',
    type: 'website',
  },
}

export default function CultScanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
