-- Migration 012: Deep integration rules — Shopify app permissions + Salesforce profile/permission-set changes
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. Shopify App Permission Rules (webhook_event detection) ─────────────────

INSERT INTO crr_rule_templates (
  rule_name, vendor_slug, risk_level, risk_category, detection_method,
  trigger_event_names, trigger_keywords, is_active
) VALUES

-- Authorization events
('Shopify App Scope Expansion',          'shopify', 'high',   'security',     'webhook_event',
  ARRAY['shopify.app.scopes_expanded','authorized_access_scopes/update'],
  ARRAY['scope','permission','oauth','access_scopes','write_customers','write_orders'],
  true),

('Shopify App High-Risk Scope Granted',  'shopify', 'high',   'security',     'webhook_event',
  ARRAY['shopify.app.authorization_granted'],
  ARRAY['write_customers','read_all_orders','write_orders','read_customer_payment_methods'],
  true),

('Shopify App Authorization Expired',    'shopify', 'medium', 'operational',  'webhook_event',
  ARRAY['shopify.app.authorization_expired','app/authorization_expired'],
  ARRAY['expired','authorization','redact','oauth'],
  true),

-- Billing events
('Shopify App Subscription Declined',    'shopify', 'high',   'pricing',      'webhook_event',
  ARRAY['shopify.app_subscription.updated','app_subscriptions/update'],
  ARRAY['DECLINED','CANCELLED','cancelled','declined','billing','subscription'],
  true),

('Shopify App Billing Cap Approaching',  'shopify', 'high',   'pricing',      'webhook_event',
  ARRAY['shopify.app_subscription.approaching_cap','app_subscriptions/approaching_capped_amount'],
  ARRAY['capped_amount','billing_cap','cap','approaching'],
  true),

('Shopify App Subscription Changed',     'shopify', 'medium', 'pricing',      'webhook_event',
  ARRAY['shopify.app_subscription.updated','app_subscriptions/update'],
  ARRAY['status','ACTIVE','PENDING','subscription','charge','price'],
  true),

-- Privacy/GDPR events
('Shopify GDPR Customer Data Request',   'shopify', 'high',   'legal',        'webhook_event',
  ARRAY['shopify.customers.data_request','customers/data_request'],
  ARRAY['data_request','gdpr','privacy','customer_id','personal_data'],
  true),

('Shopify GDPR Shop Redact Request',     'shopify', 'high',   'legal',        'webhook_event',
  ARRAY['shopify.shop.redact','shop/redact'],
  ARRAY['redact','shop_id','gdpr','delete','data_retention'],
  true),

-- App lifecycle
('Shopify App Uninstalled',              'shopify', 'medium', 'operational',  'webhook_event',
  ARRAY['shopify.app.uninstalled','app_uninstalled'],
  ARRAY['uninstalled','app_id','webhook_id','shop_domain'],
  true),

-- Observatory rules for Shopify permission pages
('Shopify API Scope Documentation Change', 'shopify', 'medium', 'security',   'changelog_scrape',
  ARRAY[]::text[],
  ARRAY['access_scope','oauth_scope','permission','read_customers','write_customers','deprecated'],
  true),

('Shopify Partner Program Policy Change',  'shopify', 'medium', 'pricing',    'tos_diff',
  ARRAY[]::text[],
  ARRAY['revenue_share','partner_program','platform_fee','app_store_policy','billing_model'],
  true),

-- ── 2. Salesforce Profile / Permission Set Rules ───────────────────────────────

('Salesforce Permission Set Assignment',       'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.permission_set.assigned'],
  ARRAY['PermissionSet','assigned','Manage Profiles','permission set','user'],
  true),

('Salesforce Permission Set Modified',         'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.permission_set.modified'],
  ARRAY['PermissionSet','Manage Profiles','permission set','modify','edit'],
  true),

('Salesforce Profile Modified',               'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.profile.modified'],
  ARRAY['Profile','Manage Profiles','profile','modify','edit'],
  true),

('Salesforce Profile Cloned',                 'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.profile.cloned'],
  ARRAY['clone','cloned','Profile','permission set','copy'],
  true),

('Salesforce Critical Permission Granted',    'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.permission_set.modified','salesforce.profile.modified'],
  ARRAY['Modify All Data','View All Data','Manage Users','ManageUsers','ModifyAllData','ViewAllData'],
  true),

('Salesforce User Role Changed',              'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.user.role_changed'],
  ARRAY['role','Manage Users','role hierarchy','RoleId','role change'],
  true),

('Salesforce User Profile Changed',           'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.user.profile_changed'],
  ARRAY['profile','Manage Users','ProfileId','profile change','profile switch'],
  true),

('Salesforce Sharing Model Modified',         'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.sharing.modified'],
  ARRAY['Sharing Settings','Organization-Wide Defaults','OWD','external','sharing model'],
  true),

('Salesforce Connected App Modified',         'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.connected_app.modified'],
  ARRAY['ConnectedApp','Manage Connected Apps','oauth','policy','IP ranges','connected app'],
  true),

('Salesforce Login Access Policy Changed',    'salesforce', 'high',   'security',    'webhook_event',
  ARRAY['salesforce.setup.login_access_policies'],
  ARRAY['Login Access Policies','login policy','IP restriction','login hours','trusted IP'],
  true),

-- Observatory rules for Salesforce documentation
('Salesforce Critical Update Affects Permissions', 'salesforce', 'high', 'security',  'changelog_scrape',
  ARRAY[]::text[],
  ARRAY['critical update','permission','profile','security control','enforce','release update'],
  true),

('Salesforce API Version Retirement',         'salesforce', 'high',   'operational', 'changelog_scrape',
  ARRAY[]::text[],
  ARRAY['api version','retire','end of life','sunset','version removal','deprecated api'],
  true),

('Salesforce Permission Set Architecture Change', 'salesforce', 'medium', 'operational', 'changelog_scrape',
  ARRAY[]::text[],
  ARRAY['permission set group','enhanced profile','profile migration','muted permission'],
  true)

ON CONFLICT (rule_name, vendor_slug) DO UPDATE SET
  risk_level           = EXCLUDED.risk_level,
  risk_category        = EXCLUDED.risk_category,
  detection_method     = EXCLUDED.detection_method,
  trigger_event_names  = EXCLUDED.trigger_event_names,
  trigger_keywords     = EXCLUDED.trigger_keywords,
  is_active            = EXCLUDED.is_active;

-- ── 3. Add trigger_event_names GIN index if not exists ───────────────────────
CREATE INDEX IF NOT EXISTS idx_rules_trigger_events
  ON crr_rule_templates USING gin(trigger_event_names);
