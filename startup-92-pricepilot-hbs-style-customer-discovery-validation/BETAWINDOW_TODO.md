# BetaWindow QA Test — Manual Submission Required

The BetaWindow API returns 401 Unauthorized with the provided key. Submit manually:

1. Go to https://betawindow.com and sign in using `scide-qa-pricepilot@agentmail.to`
2. Select **Standard ($10)** tier — 20 min, 3 flows
3. URL: `https://startup-92-pricepilot-hbs-style-cus.vercel.app`
4. Instructions:
   > Test 3 flows:
   > (1) Visit homepage, click Get Started, complete signup.
   > (2) After signup, navigate to Import — verify CSV upload is the primary recommended option with a "Fastest path — no API keys needed" banner. Try uploading a CSV file.
   > (3) Navigate to Experiments → create a new experiment — verify a green rollback-safety callout ("Safe to launch") appears above the Launch button. Note any errors, confusing UI, or broken steps.
5. Deliver report to `scide-qa-pricepilot@agentmail.to`
