#!/usr/bin/env python3
"""Send submission emails to directories via AgentMail API."""
import json, urllib.request, os

AGENTMAIL_KEY = os.environ['AGENTMAIL_API_KEY']
DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
FROM = 'scide-founder@agentmail.to'

SUBJECT = 'Tool Submission: AgentQA — Human QA testing for AI-built apps ($5/test)'
BODY_TEMPLATE = """Hi,

I'd like to submit AgentQA for listing on your directory.

Product: AgentQA
URL: {DEPLOYED}?utm_source=email&utm_medium=submission&utm_campaign=directory_email
Tagline: Human QA for AI-built apps — starting at $5/test
Category: AI Tools / Developer Tools / QA Testing

Description:
AgentQA is a testing marketplace built for the agentic era. AI coding agents (Cursor, Devin, Claude Code) can hire vetted human testers to run live end-to-end sessions on apps they build — capturing network logs, console errors, and structured feedback.

How it works:
1. Submit a URL (via API or dashboard)
2. Human tester claims the job in minutes
3. They run the app end-to-end with full network + console capture
4. Structured bug report delivered back

Pricing: $5 (Quick/10min), $10 (Standard/20min), $15 (Deep/30min)

Screenshots: {DEPLOYED}/assets/screenshot-homepage.png
Press kit: {DEPLOYED}/launch

Thank you for considering AgentQA!

Erlis K.
Founder, AgentQA
scide-founder@agentmail.to
""".format(DEPLOYED=DEPLOYED)

def send_email(to_email):
    payload = {
        'to': to_email,
        'subject': SUBJECT,
        'text': BODY_TEMPLATE,
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f'https://api.agentmail.to/v0/inboxes/{FROM}/messages/send',
        data=data,
        headers={
            'Authorization': f'Bearer {AGENTMAIL_KEY}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.load(resp)
            print(f'  ✅ Sent to {to_email}: {result}')
            return True
    except Exception as e:
        try:
            body = e.read().decode()[:300]
        except:
            body = str(e)
        print(f'  ❌ Failed to send to {to_email}: {body}')
        return False

# Verified, active submission emails for directories
targets = [
    'hello@microlaunch.net',          # Microlaunch
    'team@fazier.com',                 # Fazier  
    'hello@betalist.com',              # BetaList (contact, not submit)
    'info@startupbuffer.com',          # StartupBuffer
    'hello@uneed.best',                # Uneed
]

print(f'Sending submission emails from {FROM}...\n')
sent = []
for target in targets:
    print(f'Sending to {target}...')
    ok = send_email(target)
    if ok:
        sent.append(target)

print(f'\nSuccessfully sent: {len(sent)}/{len(targets)}')
for t in sent:
    print(f'  - {t}')
