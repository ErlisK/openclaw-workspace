import Link from 'next/link'

export default function Footer() {
  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '40px 24px',
        color: '#9ca3af',
        fontSize: 13,
        borderTop: '1px solid #f3f4f6',
        background: '#fff',
      }}
    >
      <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#7c3aed' }}>
        🎨 Parent-friendly, kid-safe.
      </p>
      <p style={{ margin: '0 0 10px' }}>
        <Link href="/privacy" style={{ color: '#7c3aed', textDecoration: 'none', margin: '0 12px' }}>
          Privacy Policy
        </Link>
        <Link href="/terms" style={{ color: '#7c3aed', textDecoration: 'none', margin: '0 12px' }}>
          Terms of Service
        </Link>
        <Link href="/contact" style={{ color: '#7c3aed', textDecoration: 'none', margin: '0 12px' }}>
          Contact
        </Link>
      </p>
      <p style={{ margin: 0 }}>© 2026 KidColoring. Made with ❤️ for little artists everywhere.</p>
    </footer>
  )
}
