import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// GET /api/widget/[sessionId] — returns the widget JS bundle
// This is the script tag URL designers embed on their site
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'

  // Fetch session data to embed in the script
  const supabase = createServiceClient()
  const { data: session } = await supabase
    .from('playtest_sessions')
    .select('id, title, max_testers, scheduled_at, platform, status, projects(name, game_type)')
    .eq('id', sessionId)
    .in('status', ['recruiting', 'scheduled'])
    .single()

  const { count: signupCount } = await supabase
    .from('session_signups')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['registered', 'confirmed'])

  const spotsLeft = session ? session.max_testers - (signupCount ?? 0) : 0

  // Build the embeddable JS — pure vanilla JS, no dependencies
  const js = buildWidgetScript({ session, spotsLeft, origin, sessionId })

  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function buildWidgetScript({
  session,
  spotsLeft,
  origin,
  sessionId,
}: {
  session: any
  spotsLeft: number
  origin: string
  sessionId: string
}) {
  const sessionData = session
    ? JSON.stringify({
        title: session.title,
        projectName: session.projects?.name ?? '',
        platform: session.platform ?? '',
        scheduled: session.scheduled_at
          ? new Date(session.scheduled_at).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : null,
        spotsLeft,
        maxTesters: session.max_testers,
        open: spotsLeft > 0,
      })
    : 'null'

  return `
(function() {
  'use strict';
  var SESSION_ID = ${JSON.stringify(sessionId)};
  var API_ORIGIN = ${JSON.stringify(origin)};
  var SESSION = ${sessionData};

  // Find or create mount target
  var scripts = document.querySelectorAll('script[data-ptf-session]');
  var mountEl = null;
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].getAttribute('data-ptf-session') === SESSION_ID) {
      mountEl = document.createElement('div');
      mountEl.id = 'ptf-widget-' + SESSION_ID;
      scripts[i].parentNode.insertBefore(mountEl, scripts[i].nextSibling);
      break;
    }
  }
  if (!mountEl) {
    mountEl = document.getElementById('ptf-widget-' + SESSION_ID);
  }
  if (!mountEl) return;

  // Styles
  var style = document.createElement('style');
  style.textContent = [
    '#ptf-widget-' + SESSION_ID + ' { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
    '.ptf-card { background: #1a1a2e; border: 1px solid rgba(255,165,0,0.25); border-radius: 12px; padding: 20px; color: #fff; max-width: 480px; margin: 12px 0; }',
    '.ptf-title { font-size: 1.1rem; font-weight: 700; margin: 0 0 4px; }',
    '.ptf-meta { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-bottom: 14px; }',
    '.ptf-spots { display: inline-block; background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); border-radius: 999px; font-size: 0.75rem; padding: 2px 10px; margin-bottom: 14px; }',
    '.ptf-spots.urgent { background: rgba(249,115,22,0.15); color: #fb923c; border-color: rgba(249,115,22,0.3); }',
    '.ptf-spots.full { background: rgba(239,68,68,0.1); color: #f87171; border-color: rgba(239,68,68,0.3); }',
    '.ptf-form { display: flex; flex-direction: column; gap: 10px; }',
    '.ptf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }',
    '.ptf-input { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 9px 12px; color: #fff; font-size: 0.875rem; width: 100%; box-sizing: border-box; outline: none; }',
    '.ptf-input:focus { border-color: #f97316; }',
    '.ptf-input::placeholder { color: rgba(255,255,255,0.3); }',
    '.ptf-consent { display: flex; align-items: flex-start; gap: 8px; font-size: 0.75rem; color: rgba(255,255,255,0.55); cursor: pointer; }',
    '.ptf-consent input { margin-top: 2px; accent-color: #f97316; flex-shrink: 0; }',
    '.ptf-btn { background: #f97316; color: #fff; border: none; border-radius: 8px; padding: 11px 20px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }',
    '.ptf-btn:hover { background: #ea6c0a; }',
    '.ptf-btn:disabled { opacity: 0.5; cursor: default; }',
    '.ptf-error { color: #f87171; font-size: 0.8rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); border-radius: 6px; padding: 8px 12px; }',
    '.ptf-success { text-align: center; padding: 20px; }',
    '.ptf-success .ptf-emoji { font-size: 2.5rem; display: block; margin-bottom: 10px; }',
    '.ptf-success h3 { margin: 0 0 6px; font-size: 1.1rem; }',
    '.ptf-success p { margin: 0; font-size: 0.85rem; color: rgba(255,255,255,0.6); }',
    '.ptf-footer { margin-top: 8px; font-size: 0.7rem; text-align: right; }',
    '.ptf-footer a { color: rgba(255,165,0,0.6); text-decoration: none; }',
    '.ptf-footer a:hover { color: #f97316; }',
    '.ptf-closed { text-align: center; padding: 20px; color: rgba(255,255,255,0.5); font-size: 0.9rem; }',
  ].join('\\n');
  document.head.appendChild(style);

  function render() {
    if (!SESSION) {
      mountEl.innerHTML = '<div class="ptf-card"><div class="ptf-closed">Session not found or no longer recruiting.</div></div>';
      return;
    }
    if (!SESSION.open) {
      mountEl.innerHTML = '<div class="ptf-card"><div class="ptf-closed">This playtest session is currently full.</div>' +
        '<div class="ptf-footer"><a href="' + API_ORIGIN + '" target="_blank">Powered by PlaytestFlow</a></div></div>';
      return;
    }

    var spotsClass = SESSION.spotsLeft <= 3 ? 'urgent' : '';
    var spotsText = SESSION.spotsLeft + ' spot' + (SESSION.spotsLeft !== 1 ? 's' : '') + ' remaining';

    mountEl.innerHTML =
      '<div class="ptf-card">' +
        '<h3 class="ptf-title">' + escHtml(SESSION.title) + '</h3>' +
        '<div class="ptf-meta">' + escHtml(SESSION.projectName) +
          (SESSION.platform ? ' &middot; ' + escHtml(SESSION.platform) : '') +
          (SESSION.scheduled ? ' &middot; ' + escHtml(SESSION.scheduled) : '') +
        '</div>' +
        '<div class="ptf-spots ' + spotsClass + '">' + spotsText + '</div>' +
        '<form class="ptf-form" id="ptf-form-' + SESSION_ID + '">' +
          '<div class="ptf-row">' +
            '<input class="ptf-input" type="text" name="name" placeholder="Your name" required />' +
            '<input class="ptf-input" type="email" name="email" placeholder="Email address" required />' +
          '</div>' +
          '<input class="ptf-input" type="text" name="role" placeholder="Role preference (optional)" />' +
          '<label class="ptf-consent">' +
            '<input type="checkbox" name="consent" required />' +
            'I agree to participate in this playtest and provide feedback. I can withdraw at any time.' +
          '</label>' +
          '<div id="ptf-error-' + SESSION_ID + '" style="display:none" class="ptf-error"></div>' +
          '<button type="submit" class="ptf-btn" id="ptf-btn-' + SESSION_ID + '">Sign Up to Playtest</button>' +
        '</form>' +
        '<div class="ptf-footer"><a href="' + API_ORIGIN + '" target="_blank">Powered by PlaytestFlow</a></div>' +
      '</div>';

    var form = document.getElementById('ptf-form-' + SESSION_ID);
    form.addEventListener('submit', handleSubmit);
  }

  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function handleSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var btn = document.getElementById('ptf-btn-' + SESSION_ID);
    var errEl = document.getElementById('ptf-error-' + SESSION_ID);

    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var role = form.role ? form.role.value.trim() : '';
    var consent = form.consent.checked;

    if (!consent) {
      errEl.textContent = 'Please check the consent box.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing up\u2026';
    errEl.style.display = 'none';

    fetch(API_ORIGIN + '/api/sessions/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID, name: name, email: email, role: role, consent: consent }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        var card = mountEl.querySelector('.ptf-card');
        card.innerHTML =
          '<div class="ptf-success">' +
            '<span class="ptf-emoji">🎉</span>' +
            "<h3>You're signed up!</h3>" +
            '<p>We\\'ll send session details to <strong>' + escHtml(email) + '</strong>.</p>' +
          '</div>' +
          '<div class="ptf-footer"><a href="' + API_ORIGIN + '" target="_blank">Powered by PlaytestFlow</a></div>';
      } else {
        errEl.textContent = data.error || 'Something went wrong. Please try again.';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Sign Up to Playtest';
      }
    })
    .catch(function() {
      errEl.textContent = 'Network error. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Sign Up to Playtest';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
`.trim()
}
