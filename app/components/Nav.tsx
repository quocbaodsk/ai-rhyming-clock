'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

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
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLinkClick = () => {
    setIsOpen(false)
  }

  return (
    <nav className='nav'>
      {isMobile ? (
        <>
          <button className='nav-toggle' onClick={() => setIsOpen(!isOpen)} aria-label='Toggle menu'>
            <span className={`nav-hamburger${isOpen ? ' nav-open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <div className={`nav-menu${isOpen ? ' nav-menu-open' : ''}`}>
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className={`nav-link-mobile${pathname === link.href ? ' nav-active-mobile' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </>
      ) : (
        links.map(link => (
          <Link key={link.href} href={link.href} className={`nav-link${pathname === link.href ? ' nav-active' : ''}`}>
            {link.label}
          </Link>
        ))
      )}
    </nav>
  )
}
