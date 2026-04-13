import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimCheck Studio — Evidence-Backed Content for Life Sciences",
  description:
    "ClaimCheck Studio extracts factual claims from manuscripts and transcripts, finds peer-reviewed support across PubMed, CrossRef, Scite, and Unpaywall, assigns provenance scores, flags risks, and auto-generates compliant, channel-ready outputs.",
  metadataBase: new URL("https://citebundle.com"),
  openGraph: {
    title: "ClaimCheck Studio — Evidence-Backed Content for Life Sciences",
    description:
      "Turn your manuscripts and transcripts into channel-ready, evidence-backed content with automated citation bundles and compliance guardrails.",
    url: "https://citebundle.com",
    siteName: "ClaimCheck Studio",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ClaimCheck Studio",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClaimCheck Studio — Evidence-Backed Content for Life Sciences",
    description:
      "Turn manuscripts into channel-ready content with automated biomedical citation bundles.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  if(typeof window==='undefined') return;
  var sid=null;
  try{
    sid=sessionStorage.getItem('_cc_sid');
    if(!sid){
      sid=Math.random().toString(36).slice(2)+Date.now().toString(36);
      sessionStorage.setItem('_cc_sid',sid);
      var p=new URLSearchParams(window.location.search);
      fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          type:'pageview',
          pathname:window.location.pathname,
          referrer:document.referrer||null,
          utm_source:p.get('utm_source'),
          utm_medium:p.get('utm_medium'),
          utm_campaign:p.get('utm_campaign'),
          utm_content:p.get('utm_content'),
          utm_term:p.get('utm_term'),
          user_agent:navigator.userAgent,
          session_id:sid
        })
      }).catch(function(){});
    }
  }catch(e){}
})();
`,
          }}
        />
      </body>
    </html>
  );
}
