# Getting Started

Welcome to the **Acme API**. This guide walks you through authenticating and making your first call.

## Installation

```bash
npm install acme-sdk
pip install acme-sdk
```

## Authenticate

```python
# BROKEN: missing import — will fail in sandbox
client = AcmeClient(api_key="sk_test_abc123")
client.connect()  # DRIFT: OpenAPI shows client.init(), not client.connect()
print(client.status())
```

```javascript
// BROKEN: acme-sdk not installed in sandbox — will throw ModuleNotFoundError
const { AcmeClient } = require('acme-sdk');
const client = new AcmeClient({ apiKey: 'sk_test_abc123' });
await client.connect();
console.log(await client.status());
```

## Make Your First API Call

```python
# PASSING: pure Python, no external deps
import json

payload = {
    "event": "docs.verified",
    "version": "1.0.0",
    "snippets_checked": 12,
}
print(json.dumps(payload, indent=2))
```

```typescript
// PASSING: pure TS, no imports needed
const result: { ok: boolean; message: string } = {
  ok: true,
  message: "DocsCI verified this snippet successfully",
};
console.log(JSON.stringify(result, null, 2));
```

## Error Handling

```python
# BROKEN: syntax error — missing closing parenthesis
try:
    response = client.get("/users"
except Exception as e:
    print(f"Error: {e}")
```

```javascript
// PASSING: no external deps
function formatError(code, message) {
  return JSON.stringify({ error: { code, message } }, null, 2);
}
console.log(formatError(404, 'Resource not found'));
```

## Pagination

```python
# PASSING: stdlib only
def paginate(items, page_size=10):
    for i in range(0, len(items), page_size):
        yield items[i:i + page_size]

results = list(paginate(list(range(25)), 10))
print(f"Pages: {len(results)}, items per page: {[len(p) for p in results]}")
```
