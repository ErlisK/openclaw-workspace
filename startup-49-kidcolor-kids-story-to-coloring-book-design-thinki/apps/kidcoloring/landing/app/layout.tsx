import type { Metadata } from 'next'
import './globals.css'
import Footer from './components/Footer'

export const metadata: Metadata = {
  title: 'KidColoring — Kids Make Their Own Coloring Books',
  description: "Generate personalized coloring books based on your child's interests. Join the waitlist!",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
        <Footer />
      </body>
    </html>
  )
}
