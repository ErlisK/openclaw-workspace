# Operating Rules

These rules are mandatory. Follow them in every task, every step, no exceptions.

## Security

- **Never hardcode secrets.** Always reference environment variables: `$SECRET_NAME` in shell, `process.env.SECRET_NAME` in code.
- **Never expose secret keys in client-side code.** Only `NEXT_PUBLIC_*` variables are safe for the browser. Server-side secrets stay in API routes.
- **Never commit `.env` files or secrets to git.** Use `.gitignore` to exclude them.
- **Never log secret values.** Log the key name if needed, never the value.

## Deployment

- **Always deploy via `vercel --prod`** from inside the project directory.
- **Set environment variables in Vercel before deploying**: `vercel env add NAME` for each required secret.
- **If a custom domain is provided in your task context**, add it after deploying: `vercel domains add <domain>`. DNS is configured server-side.
- **Always test the deployed URL** after deployment. Visit it, check for errors.

## Payment Integration

- When `STRIPE_SECRET_KEY` is available, **use the pre-built payment templates** at `/opt/scide/templates/payments/`.
- Copy templates into your project: `cp -r /opt/scide/templates/payments/* ./` and adapt to your app's structure.
- **Never rewrite Stripe integration logic from scratch** — the templates handle checkout sessions, webhook signature verification, and the customer portal correctly.
- Create Stripe products and prices via the API using `curl` and `$STRIPE_SECRET_KEY`.

## Spending

Every time you make a purchase or incur a cost, you **MUST** output a spend tag in this exact format:

```
[SPEND: $AMOUNT | DESCRIPTION | CATEGORY]
```

Examples:
- `[SPEND: $12.00 | Google Workspace registration | domain]`
- `[SPEND: $50.00 | Facebook Ads campaign | marketing]`

Valid categories: `hosting`, `domain`, `marketing`, `tools`, `api`, `design`, `legal`, `other`

If your spending budget is **exhausted**, do NOT attempt any more purchases. Continue with non-spending work only.

## Output

- Save all deliverable files (reports, CSVs, specs, analysis) to the current working directory.
- Save copies of key source files to `src/` for the file vault.

## Code Quality

- Use **TypeScript** for all new code. Avoid `any` types.
- Handle errors at system boundaries (API routes, external calls). Don't over-engineer internal error handling.
- **Test before deploying.** Run `npm run build` at minimum. Fix build errors before pushing.
- Don't over-engineer. Ship the simplest working solution.

## Shell Commands

- **Never use heredocs** (`cat > file << 'EOF'`) — they trigger exec preflight rejection.
- **To create files**, use the file write tool, not shell redirects or heredocs.
- **To run scripts**, use simple direct commands: `python3 /tmp/script.py` or `node /tmp/script.js`.
- **Chained commands** (`&&`, `||`) are allowed, but keep them simple.

## Git

- Commit meaningful changes with descriptive messages.
- Push to the startup's GitHub repository after each significant milestone.
- Use `.gitignore` to exclude `node_modules/`, `.next/`, `.env*`, etc.
