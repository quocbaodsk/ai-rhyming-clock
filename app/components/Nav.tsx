'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'RHYME CLOCK' },
  { href: '/drum', label: 'DRUM MACHINE' },
  { href: '/game', label: 'PLATFORMER' },
  { href: '/coach', label: 'CODE COACH' },
  { href: '/qr', label: 'QR GEN' },
  { href: '/codeverter', label: 'CODEVERTER' },
  { href: '/life', label: 'LIFE IN WEEKS' },
  { href: '/constellation', label: 'STAR STORIES' },
  { href: '/story', label: 'BEDTIME' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className='nav'>
      {links.map(link => (
        <Link key={link.href} href={link.href} className={`nav-link${pathname === link.href ? ' nav-active' : ''}`}>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
