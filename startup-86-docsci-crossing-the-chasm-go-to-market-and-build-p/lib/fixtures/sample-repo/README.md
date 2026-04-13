# DocsCI Sample Repository

> **Demo fixture** — used by the "Use sample repo" one-click demo path.
> Contains intentionally broken code examples so DocsCI can demonstrate findings and AI suggestions.

## Quick Start

This is a sample Docusaurus-style documentation repository with:
- Python, JavaScript, and TypeScript code blocks
- Some intentionally broken snippets (missing imports, syntax errors, wrong API usage)
- An OpenAPI YAML for API smoke-test demonstrations
- A drift signature: the docs reference `client.connect()` but the OpenAPI spec shows `client.init()`

DocsCI will:
1. Extract all code blocks from Markdown files
2. Execute them in hermetic sandboxes
3. Detect API/SDK drift against the OpenAPI spec
4. Generate AI fix suggestions with patch diffs
5. Produce downloadable `.patch` files for each finding
