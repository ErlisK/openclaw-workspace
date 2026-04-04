"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const active = (href: string) => path === href ? { color: "var(--foreground)" } : {};
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo">
          <span className="logo-icon">📡</span>
          Change Risk Radar
        </Link>
        <div className="nav-links">
          <Link href="/demo" style={active("/demo")}>🔴 Live Demo</Link>
          <Link href="/observatory" style={active("/observatory")}>Observatory</Link>
          <Link href="/taxonomy" style={active("/taxonomy")}>Taxonomy</Link>
          <Link href="/hypothesis" style={active("/hypothesis")}>Hypothesis</Link>
          <Link href="/#waitlist" className="btn-primary" style={{padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
            Join Waitlist
          </Link>
        </div>
      </div>
    </nav>
  );
}
