'use client';
/**
 * components/WizardShell.tsx
 * Step-by-step wizard UI. Manages local state, autosaves drafts, and
 * calls /api/wizard/generate on completion.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import ExportGate from '@/components/ExportGate';
import { analytics } from '@/lib/analytics';
import { useRouter } from 'next/navigation';
import {
  WizardAnswers,
  EMPTY_ANSWERS,
  STEP_LABELS,
  TOTAL_STEPS,
  LICENSE_TYPE_OPTIONS,
  PLATFORM_OPTIONS,
  DURATION_OPTIONS,
  CURRENCY_OPTIONS,
  REVISION_OPTIONS,
  RIGHTS_TYPE_OPTIONS,
  DEPOSIT_OPTIONS,
  DEFAULT_TEMPLATE,
  LicenseType,
} from '@/lib/wizard-types';
import { JURISDICTION_OPTIONS } from '@/lib/jurisdiction';
import { JurisdictionWarning } from '@/components/JurisdictionWarning';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Toggle({
  checked, onChange, id, label, help,
}: { checked: boolean; onChange: (v: boolean) => void; id: string; label: string; help?: string }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <div className="mt-0.5">
        <input
          id={id} type="checkbox" className="sr-only"
          checked={checked} onChange={e => onChange(e.target.checked)}
        />
        <div
          role="switch"
          aria-checked={checked}
          aria-label={label}
          tabIndex={0}
          onClick={() => onChange(!checked)}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onChange(!checked)}
          className={`w-10 h-6 rounded-full transition-colors flex items-center cursor-pointer ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full shadow mx-1 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">{label}</p>
        {help && <p className="text-xs text-gray-500 mt-0.5">{help}</p>}
      </div>
    </label>
  );
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = 'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none';
const selectCls = inputCls;

// ─── Step components ──────────────────────────────────────────────────────────

function Step1LicenseType({
  answers, set,
}: { answers: WizardAnswers; set: (k: keyof WizardAnswers, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">What kind of contract do you need?</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {LICENSE_TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              set('license_type', opt.value as LicenseType);
              set('template_slug', DEFAULT_TEMPLATE[opt.value as LicenseType]);
            }}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              answers.license_type === opt.value
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="text-2xl mb-1">{opt.emoji}</div>
            <div className="font-semibold text-gray-900 text-sm">{opt.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2PlatformJurisdiction({
  answers, set,
}: { answers: WizardAnswers; set: (k: keyof WizardAnswers, v: unknown) => void }) {
  return (
    <div className="space-y-5">
      <Field label="Where are you selling / working?" required>
        <select id="platform" name="platform" className={selectCls} value={answers.platform} onChange={e => set('platform', e.target.value)}>
          {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>

      <Field label="Your jurisdiction (governing law)" required hint="Sets the governing law in your contract.">
        <select id="jurisdiction" name="jurisdiction" className={selectCls} value={answers.jurisdiction} onChange={e => set('jurisdiction', e.target.value)}>
          <optgroup label="✅ Fully supported">
            {JURISDICTION_OPTIONS.filter(j => j.supported).map(j => (
              <option key={j.code} value={j.code}>{j.label}</option>
            ))}
          </optgroup>
          <optgroup label="⚠️ Limited support">
            {JURISDICTION_OPTIONS.filter(j => !j.supported).map(j => (
              <option key={j.code} value={j.code}>{j.label}</option>
            ))}
          </optgroup>
        </select>
        <JurisdictionWarning jurisdictionCode={answers.jurisdiction} />
      </Field>
    </div>
  );
}

function Step3LicenseTerms({
  answers, set,
}: { answers: WizardAnswers; set: (k: keyof WizardAnswers, v: unknown) => void }) {
  const isAsset      = answers.license_type === 'digital_asset_license';
  const isCommission = answers.license_type === 'commission_agreement';
  const isCollab     = answers.license_type === 'collaborator_split';

  return (
    <div className="space-y-5">
      {/* Exclusivity — applies to asset + commission */}
      {(isAsset || isCommission) && (
        <Field label="Exclusivity">
          <div className="flex gap-3">
            {(['non-exclusive', 'exclusive'] as const).map(v => (
              <button key={v} type="button"
                onClick={() => set('exclusivity', v)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                  answers.exclusivity === v
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                }`}>
                {v === 'non-exclusive' ? 'Non-exclusive (standard)' : 'Exclusive (only to buyer)'}
              </button>
            ))}
          </div>
        </Field>
      )}

      {/* Duration */}
      <Field label="License duration">
        <select className={selectCls} value={answers.duration} onChange={e => set('duration', e.target.value)}>
          {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>

      {/* Asset-specific toggles */}
      {isAsset && (
        <div className="space-y-4 pt-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Permissions</p>
          <Toggle id="commercial_use"  checked={answers.commercial_use}  onChange={v => set('commercial_use', v)}  label="Allow commercial use"       help="Buyer can use in products that generate revenue" />
          <Toggle id="client_work"     checked={answers.client_work}     onChange={v => set('client_work', v)}     label="Allow client work use"      help="Buyer can use in client projects they bill for" />
          <Toggle id="print_on_demand" checked={answers.print_on_demand} onChange={v => set('print_on_demand', v)} label="Allow print-on-demand"      help="Buyer can include in merchandise" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Restrictions</p>
          <Toggle id="no_resale"       checked={answers.no_resale}       onChange={v => set('no_resale', v)}       label="Prohibit resale of original files" />
          <Toggle id="no_ai_training"  checked={answers.no_ai_training}  onChange={v => set('no_ai_training', v)}  label="Prohibit AI training use"   help="Cannot use files to train ML models" />
          <Toggle id="attribution_required" checked={answers.attribution_required} onChange={v => set('attribution_required', v)} label="Require attribution (credit)" />
        </div>
      )}

      {/* Collab-specific */}
      {isCollab && (
        <div className="space-y-4 pt-2">
          <Toggle id="no_ai_training" checked={answers.no_ai_training} onChange={v => set('no_ai_training', v)} label="Prohibit AI training use" />
        </div>
      )}

      {/* Commission-specific */}
      {isCommission && (
        <div className="space-y-4 pt-2">
          <Field label="Rights granted to client" required>
            <div className="space-y-2">
              {RIGHTS_TYPE_OPTIONS.map(o => (
                <label key={o.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  answers.rights_type === o.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                }`}>
                  <input type="radio" name="rights_type" value={o.value} checked={answers.rights_type === o.value}
                    onChange={() => set('rights_type', o.value)} className="mt-0.5 accent-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{o.help}</p>
                  </div>
                </label>
              ))}
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}

function Step4Details({
  answers, set,
}: { answers: WizardAnswers; set: (k: keyof WizardAnswers, v: unknown) => void }) {
  const isAsset      = answers.license_type === 'digital_asset_license';
  const isCommission = answers.license_type === 'commission_agreement';
  const isCollab     = answers.license_type === 'collaborator_split';
  const isNFT        = answers.license_type === 'nft_license';

  return (
    <div className="space-y-5">
      <Field label="Your name / studio name" required>
        <input className={inputCls} type="text" value={answers.creator_name ?? ''} placeholder="e.g. Pixel Studio"
          onChange={e => set('creator_name', e.target.value)} />
      </Field>

      {(isAsset || isNFT) && (
        <Field label="Product / asset name" required>
          <input className={inputCls} type="text" value={answers.product_name ?? ''} placeholder="e.g. Dungeon Asset Pack Vol. 1"
            onChange={e => set('product_name', e.target.value)} />
        </Field>
      )}

      {isCommission && (
        <>
          <Field label="Client name" required>
            <input className={inputCls} type="text" value={answers.client_name ?? ''} placeholder="Client or company name"
              onChange={e => set('client_name', e.target.value)} />
          </Field>
          <Field label="Commission description" required>
            <textarea className={inputCls} rows={2} value={answers.delivery_format ?? ''} placeholder="e.g. Full-body character illustration, 4000×6000 PNG"
              onChange={e => set('delivery_format', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Currency" required>
              <select className={selectCls} value={answers.currency ?? 'USD'} onChange={e => set('currency', e.target.value)}>
                {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Total fee" required>
              <input className={inputCls} type="number" min={0} value={answers.total_fee ?? ''} placeholder="500"
                onChange={e => set('total_fee', parseFloat(e.target.value) || undefined)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Deposit">
              <select className={selectCls} value={answers.deposit_percent ?? 50} onChange={e => set('deposit_percent', parseInt(e.target.value))}>
                {DEPOSIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Revisions included">
              <select className={selectCls} value={answers.revision_count ?? '2'} onChange={e => set('revision_count', e.target.value)}>
                {REVISION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Estimated delivery date" hint="e.g. 2 weeks after deposit">
            <input className={inputCls} type="text" value={answers.delivery_date ?? ''} placeholder="2 weeks after deposit received"
              onChange={e => set('delivery_date', e.target.value)} />
          </Field>
        </>
      )}

      {isCollab && (
        <>
          <Field label="Your collaborator's name" required>
            <input className={inputCls} type="text" value={answers.party_a_name ?? ''} placeholder="Partner name"
              onChange={e => set('party_a_name', e.target.value)} />
          </Field>
          <Field label="Revenue split" hint={`Total must equal 100%. You: ${answers.split_a_percent ?? 50}% / Them: ${answers.split_b_percent ?? 50}%`}>
            <div className="flex items-center gap-3">
              <input className={inputCls} type="number" min={1} max={99} value={answers.split_a_percent ?? 50}
                onChange={e => {
                  const v = Math.min(99, Math.max(1, parseInt(e.target.value) || 50));
                  set('split_a_percent', v);
                  set('split_b_percent', 100 - v);
                }} />
              <span className="text-gray-400 text-sm font-medium">/ {answers.split_b_percent ?? 50}%</span>
            </div>
          </Field>
        </>
      )}
    </div>
  );
}

function Step5Review({
  answers, generating, error, onGenerate,
}: {
  answers: WizardAnswers;
  generating: boolean;
  error: string;
  onGenerate: () => void;
}) {
  const licenseTypeLabel = LICENSE_TYPE_OPTIONS.find(o => o.value === answers.license_type)?.label ?? answers.license_type;
  const platformLabel    = PLATFORM_OPTIONS.find(o => o.value === answers.platform)?.label ?? answers.platform;
  const jurisdictionLabel = JURISDICTION_OPTIONS.find(j => j.code === answers.jurisdiction)?.label ?? answers.jurisdiction;

  const rows: [string, string][] = [
    ['Contract type',  licenseTypeLabel],
    ['Platform',       platformLabel],
    ['Jurisdiction',   jurisdictionLabel],
    ['Duration',       DURATION_OPTIONS.find(o => o.value === answers.duration)?.label ?? answers.duration],
    ...(answers.creator_name ? [['Your name', answers.creator_name] as [string, string]] : []),
    ...(answers.product_name ? [['Product', answers.product_name] as [string, string]] : []),
    ...(answers.client_name  ? [['Client',  answers.client_name]  as [string, string]] : []),
    ...(answers.total_fee    ? [['Fee',     `${answers.currency ?? 'USD'} ${answers.total_fee}`] as [string, string]] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-3 text-sm">
            <span className="text-gray-500">{k}</span>
            <span className="font-medium text-gray-900">{v}</span>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        ⚠️ <strong>Not legal advice.</strong> PactTailor generates template documents. Consult a licensed attorney for jurisdiction-specific guidance.
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <ExportGate>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating contract…
            </span>
          ) : '⚡ Generate Contract'}
        </button>
      </ExportGate>
    </div>
  );
}

// ─── Main wizard shell ─────────────────────────────────────────────────────────

export default function WizardShell({ initialDraftId }: { initialDraftId?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<WizardAnswers>(EMPTY_ANSWERS);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Update a single answer key */
  const set = useCallback((k: keyof WizardAnswers, v: unknown) => {
    setAnswers(prev => ({ ...prev, [k]: v }));
  }, []);

  /** Autosave draft whenever answers change */
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch('/api/wizard/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, draftId }),
        });
        const data = await res.json();
        if (data.ok && !draftId) setDraftId(data.draftId);
      } catch { /* silent */ }
      setSaving(false);
    }, 1200);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [answers, draftId]);

  /** Validate current step before proceeding */
  const canProceed = (): boolean => {
    if (step === 1) return !!answers.license_type;
    if (step === 2) return !!answers.platform && !!answers.jurisdiction;
    if (step === 3) {
      if (answers.license_type === 'commission_agreement') return !!answers.rights_type;
      return true;
    }
    if (step === 4) {
      if (!answers.creator_name) return false;
      if (answers.license_type === 'commission_agreement') return !!answers.client_name;
      if (answers.license_type === 'digital_asset_license' || answers.license_type === 'nft_license') return !!answers.product_name;
      return true;
    }
    return true;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const res = await fetch('/api/wizard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, draftId }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === 'export_cap_reached' || data.error === 'premium_template_locked') {
          analytics.generateBlocked(data.error as 'export_cap' | 'premium_template_locked', { license_type: answers.license_type });
        }
        throw new Error(data.error ?? 'Generation failed');
      }
      analytics.generateSuccess({
        contractId:   data.contractId,
        templateSlug: answers.template_slug ?? '',
        licenseType:  answers.license_type,
        jurisdictionCode: answers.jurisdiction ?? '',
      });
      router.push(`/contracts/${data.contractId}`);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setGenerating(false);
  };

  const stepComponents = [
    <Step1LicenseType    key={1} answers={answers} set={set} />,
    <Step2PlatformJurisdiction key={2} answers={answers} set={set} />,
    <Step3LicenseTerms   key={3} answers={answers} set={set} />,
    <Step4Details        key={4} answers={answers} set={set} />,
    <Step5Review         key={5} answers={answers} generating={generating} error={genError} onGenerate={handleGenerate} />,
  ];

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-lg font-bold text-gray-900">PactTailor</a>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {saving && <span>Saving…</span>}
          {!saving && draftId && <span className="text-green-600">Draft saved</span>}
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {step === 1 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 mb-5 text-sm text-indigo-700 flex items-start gap-2">
              <span className="mt-0.5">💡</span>
              <span>A <strong>free account</strong> is needed to download your contract. <a href="/signup" className="underline font-medium">Sign up free</a> — no credit card required.</span>
            </div>
          )}
          <h2 className="text-lg font-bold text-gray-900 mb-5">{STEP_LABELS[step - 1]}</h2>
          {stepComponents[step - 1]}

          {/* Navigation */}
          {step < TOTAL_STEPS && (
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          )}
          {step === TOTAL_STEPS && step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="mt-4 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 === step ? 'w-6 bg-indigo-600' : i + 1 < step ? 'w-3 bg-indigo-300' : 'w-3 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Templates only — not legal advice ·{' '}
          <a href="mailto:hello@pacttailor.com" className="hover:underline">hello@pacttailor.com</a>
        </p>
      </div>
    </div>
  );
}
