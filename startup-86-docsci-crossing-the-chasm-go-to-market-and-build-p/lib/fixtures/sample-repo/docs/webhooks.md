# Webhooks Guide

Configure webhooks to receive real-time events when your documents are verified.

## Register a Webhook

```python
# BROKEN: NameError — AcmeClient not defined
webhook = client.webhooks.create(
    url="https://your-app.com/webhooks/acme",
    events=["docs.verified", "snippet.failed"],
    secret="whsec_test_abc123",
)
print(webhook.id)
```

```typescript
// PASSING: demonstrates correct type annotations
interface WebhookPayload {
  id: string;
  event: string;
  createdAt: string;
  data: Record<string, unknown>;
}

function parseWebhook(raw: string): WebhookPayload {
  const parsed = JSON.parse(raw);
  if (!parsed.id || !parsed.event) {
    throw new Error("Invalid webhook payload");
  }
  return parsed as WebhookPayload;
}

const sample = JSON.stringify({
  id: "wh_01HXYZ",
  event: "docs.verified",
  createdAt: new Date().toISOString(),
  data: { snippetCount: 5, passed: 4, failed: 1 },
});
console.log(parseWebhook(sample));
```

## Verify Signature

```python
# PASSING: stdlib only — demonstrates HMAC signature verification
import hmac
import hashlib

def verify_signature(payload: bytes, secret: str, signature: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

# Test it
payload = b'{"event":"docs.verified"}'
secret = "whsec_test_abc123"
sig = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
print("Valid:", verify_signature(payload, secret, sig))
```

## Retry Logic

```javascript
// BROKEN: uses async/await at top level without async wrapper — will fail
const response = await fetch('https://api.acme.com/webhooks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://my-app.com/hook' }),
});
const data = await response.json();
console.log(data);
```
