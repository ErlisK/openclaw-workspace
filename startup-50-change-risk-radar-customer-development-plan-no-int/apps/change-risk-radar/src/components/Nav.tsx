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
          <Link href="/detectors" style={active("/detectors")}>⚡ Detectors</Link>
          <Link href="/stats" style={{...active("/stats"), fontSize: "0.8rem", opacity: 0.7}}>📊 Stats</Link>
          <Link href="/settings/notifications" style={{...active("/settings/notifications"), fontSize: "0.8rem", opacity: 0.7}}>🔔 Notifications</Link>
          <Link href="/onboard" className="btn-primary" style={{padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
            🚀 Early Access
          </Link>
        </div>
      </div>
    </nav>
  );
}
