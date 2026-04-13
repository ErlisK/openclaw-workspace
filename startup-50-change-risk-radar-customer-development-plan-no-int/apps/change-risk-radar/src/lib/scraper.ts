export interface VendorSource {
  slug: string;
  name: string;
  url: string;
  changelogUrl: string;
  category: string;
  selector?: string; // CSS selector for items
  itemTitleSelector?: string;
  itemDateSelector?: string;
  itemLinkSelector?: string;
}

export const VENDOR_SOURCES: VendorSource[] = [
  { slug: "stripe", name: "Stripe", url: "https://stripe.com", changelogUrl: "https://stripe.com/docs/changelog", category: "payments" },
  { slug: "shopify", name: "Shopify", url: "https://shopify.dev", changelogUrl: "https://shopify.dev/changelog", category: "ecommerce" },
  { slug: "aws", name: "AWS", url: "https://aws.amazon.com", changelogUrl: "https://aws.amazon.com/new/feed/", category: "cloud" },
  { slug: "github", name: "GitHub", url: "https://github.com", changelogUrl: "https://github.blog/changelog/", category: "devtools" },
  { slug: "cloudflare", name: "Cloudflare", url: "https://cloudflare.com", changelogUrl: "https://blog.cloudflare.com/tag/changelog/", category: "infrastructure" },
  { slug: "twilio", name: "Twilio", url: "https://twilio.com", changelogUrl: "https://www.twilio.com/changelog", category: "communications" },
  { slug: "sendgrid", name: "SendGrid", url: "https://sendgrid.com", changelogUrl: "https://docs.sendgrid.com/release-notes", category: "email" },
  { slug: "hubspot", name: "HubSpot", url: "https://hubspot.com", changelogUrl: "https://developers.hubspot.com/changelog", category: "crm" },
  { slug: "salesforce", name: "Salesforce", url: "https://salesforce.com", changelogUrl: "https://help.salesforce.com/s/articleView?id=release-notes.salesforce_release_notes.htm", category: "crm" },
  { slug: "slack", name: "Slack", url: "https://slack.com", changelogUrl: "https://api.slack.com/changelog", category: "productivity" },
  { slug: "zoom", name: "Zoom", url: "https://zoom.us", changelogUrl: "https://developers.zoom.us/docs/changelog/", category: "productivity" },
  { slug: "okta", name: "Okta", url: "https://okta.com", changelogUrl: "https://developer.okta.com/docs/release-notes/", category: "security" },
  { slug: "plaid", name: "Plaid", url: "https://plaid.com", changelogUrl: "https://plaid.com/docs/link/changelog/", category: "fintech" },
  { slug: "intercom", name: "Intercom", url: "https://intercom.com", changelogUrl: "https://developers.intercom.com/docs/build-an-integration/learn-more/whats-new/", category: "support" },
  { slug: "zendesk", name: "Zendesk", url: "https://zendesk.com", changelogUrl: "https://developer.zendesk.com/documentation/ticketing/whats-new-in-the-zendesk-support-api/", category: "support" },
  { slug: "quickbooks", name: "QuickBooks", url: "https://quickbooks.intuit.com", changelogUrl: "https://developer.intuit.com/app/developer/qbo/docs/changelog", category: "accounting" },
  { slug: "xero", name: "Xero", url: "https://xero.com", changelogUrl: "https://developer.xero.com/documentation/changelog/", category: "accounting" },
  { slug: "paypal", name: "PayPal", url: "https://paypal.com", changelogUrl: "https://developer.paypal.com/changelog/", category: "payments" },
  { slug: "klaviyo", name: "Klaviyo", url: "https://klaviyo.com", changelogUrl: "https://help.klaviyo.com/hc/en-us/sections/4403979975579", category: "marketing" },
  { slug: "mailchimp", name: "Mailchimp", url: "https://mailchimp.com", changelogUrl: "https://mailchimp.com/release-notes/", category: "marketing" },
  { slug: "google-workspace", name: "Google Workspace", url: "https://workspace.google.com", changelogUrl: "https://workspace.google.com/whatsnew/", category: "productivity" },
  { slug: "meta-ads", name: "Meta Ads", url: "https://business.facebook.com", changelogUrl: "https://developers.facebook.com/docs/marketing-api/changelog/", category: "advertising" },
  { slug: "google-ads", name: "Google Ads", url: "https://ads.google.com", changelogUrl: "https://developers.google.com/google-ads/api/docs/release-notes", category: "advertising" },
  { slug: "chargebee", name: "Chargebee", url: "https://chargebee.com", changelogUrl: "https://apidocs.chargebee.com/docs/api/changelog", category: "billing" },
  { slug: "recurly", name: "Recurly", url: "https://recurly.com", changelogUrl: "https://docs.recurly.com/changelog/", category: "billing" },
  { slug: "vercel", name: "Vercel", url: "https://vercel.com", changelogUrl: "https://vercel.com/changelog", category: "devtools" },
  { slug: "heroku", name: "Heroku", url: "https://heroku.com", changelogUrl: "https://devcenter.heroku.com/changelog", category: "cloud" },
  { slug: "datadog", name: "Datadog", url: "https://datadoghq.com", changelogUrl: "https://docs.datadoghq.com/agent/changelog/", category: "observability" },
  { slug: "pagerduty", name: "PagerDuty", url: "https://pagerduty.com", changelogUrl: "https://developer.pagerduty.com/changelog", category: "observability" },
  { slug: "netlify", name: "Netlify", url: "https://netlify.com", changelogUrl: "https://www.netlify.com/changelog/", category: "devtools" },
];

export function classifyRisk(title: string, content: string): { risk_level: string; risk_category: string } {
  const text = `${title} ${content}`.toLowerCase();
  
  // Pricing risk
  if (/fee|price|pricing|cost|rate|charge|billing|subscription|tier|plan/.test(text)) {
    const high = /increas|hike|higher|more expensive|new fee/.test(text);
    return { risk_level: high ? "high" : "medium", risk_category: "pricing" };
  }
  // Security risk
  if (/security|vulnerab|breach|cve|patch|exploit|auth|credential|password|tls|ssl|cert/.test(text)) {
    return { risk_level: "high", risk_category: "security" };
  }
  // Legal/compliance risk
  if (/terms|tos|privacy|gdpr|ccpa|compliance|policy|data retention|agreement|legal/.test(text)) {
    return { risk_level: "high", risk_category: "legal" };
  }
  // API deprecation
  if (/deprecat|sunset|end.of.life|eol|removed|discontinu/.test(text)) {
    return { risk_level: "high", risk_category: "operational" };
  }
  // Breaking changes
  if (/breaking|break |incompatib|migration|upgrade required/.test(text)) {
    return { risk_level: "high", risk_category: "operational" };
  }
  // API changes
  if (/api|endpoint|webhook|sdk|library|integration|release|version/.test(text)) {
    return { risk_level: "medium", risk_category: "operational" };
  }
  
  return { risk_level: "low", risk_category: "operational" };
}

export async function fetchVendorChangelog(vendor: VendorSource): Promise<{
  title: string; description: string; url: string; published_at: string | null;
}[]> {
  try {
    const res = await fetch(vendor.changelogUrl, {
      headers: { "User-Agent": "ChangeRiskRadar/1.0 (changelog monitor; contact: hello@changeriskadar.com)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    
    // Parse RSS/Atom if XML
    if (text.includes("<rss") || text.includes("<feed") || text.includes("<?xml")) {
      return parseRSS(text, vendor);
    }
    
    // Parse HTML for common changelog patterns
    return parseHTML(text, vendor);
  } catch {
    return [];
  }
}

function parseRSS(xml: string, vendor: VendorSource): { title: string; description: string; url: string; published_at: string | null }[] {
  const items: { title: string; description: string; url: string; published_at: string | null }[] = [];
  
  // Simple regex-based RSS parser
  const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const item = match[1] || match[2];
    const title = extractTag(item, "title") || "Update";
    const link = extractTag(item, "link") || extractAttr(item, "link", "href") || vendor.changelogUrl;
    const desc = stripHtml(extractTag(item, "description") || extractTag(item, "summary") || extractTag(item, "content") || "");
    const date = extractTag(item, "pubDate") || extractTag(item, "published") || extractTag(item, "updated") || null;
    
    if (title) {
      items.push({
        title: stripHtml(title).trim(),
        description: desc.substring(0, 500),
        url: link.trim(),
        published_at: date ? new Date(date).toISOString() : null,
      });
    }
  }
  
  return items;
}

function parseHTML(html: string, vendor: VendorSource): { title: string; description: string; url: string; published_at: string | null }[] {
  // Extract meaningful content from common changelog HTML patterns
  const items: { title: string; description: string; url: string; published_at: string | null }[] = [];
  
  // Look for h2/h3 headings that look like changelog entries
  const headingRegex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match;
  let count = 0;
  
  while ((match = headingRegex.exec(html)) !== null && count < 15) {
    const title = stripHtml(match[1]).trim();
    if (title.length > 5 && title.length < 200) {
      items.push({
        title,
        description: `Change detected on ${vendor.name} changelog`,
        url: vendor.changelogUrl,
        published_at: null,
      });
      count++;
    }
  }
  
  return items;
}

function extractTag(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return (match?.[1] || match?.[2] || "").trim();
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const match = new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, "i").exec(xml);
  return match?.[1] || "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}
