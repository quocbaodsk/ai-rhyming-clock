import type { Metadata } from 'next'
import { IBM_Plex_Mono } from 'next/font/google'
import Nav from './components/Nav'
import './globals.css'

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'Rhyme Clock',
  description: 'AI-powered rhyming clock & drum machine',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={`${ibmPlexMono.variable} antialiased`}>
        <Nav />
        {children}
      </body>
    </html>
  )
}
