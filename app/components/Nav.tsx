"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "RHYME CLOCK" },
  { href: "/drum", label: "DRUM MACHINE" },
  { href: "/game", label: "PLATFORMER" },
  { href: "/coach", label: "CODE COACH" },
  { href: "/qr", label: "QR GEN" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`nav-link${pathname === link.href ? " nav-active" : ""}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
