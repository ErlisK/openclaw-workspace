"use client";

/**
 * ProjectWizard — multi-step project creation wizard
 * Step 1: Basic info (name, GitHub repo URL with validation)
 * Step 2: Docs & OpenAPI config (docs_path, openapi_url)
 * Step 3: Security & allowlist (network allowlist, CI settings)
 * Step 4: Review & create
 *
 * Used on /dashboard/projects (replaces simple form)
 */

import { useState } from "react";

export interface WizardResult {
  name: string;
  github_repo: string;
  docs_path: string;
  openapi_path: string;
  openapi_url: string;
  allowlist_domains: string[];
  network_isolated: boolean;
  sdk_languages: string[];
  ci_enabled: boolean;
}

interface Props {
  onComplete: (data: WizardResult) => Promise<void>;
  onCancel: () => void;
  creating?: boolean;
  error?: string | null;
}

const GITHUB_RE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/.*)?$/;
const URL_RE = /^https?:\/\/.+/;

function validateGitHubUrl(url: string): string | null {
  if (!url) return null;
  if (!GITHUB_RE.test(url)) return "Must be a valid GitHub URL: https://github.com/owner/repo";
  return null;
}

function validateOpenApiUrl(url: string): string | null {
  if (!url) return null;
  if (!URL_RE.test(url)) return "Must start with https:// or http://";
  return null;
}

const STEPS = ["Project Info", "Docs & API", "Security", "Review"];

export function ProjectWizard({ onComplete, onCancel, creating, error }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardResult>({
    name: "",
    github_repo: "",
    docs_path: "docs",
    openapi_path: "",
    openapi_url: "",
    allowlist_domains: [],
    network_isolated: false,
    sdk_languages: [],
    ci_enabled: true,
  });
  const [repoError, setRepoError] = useState<string | null>(null);
  const [openapiError, setOpenapiError] = useState<string | null>(null);
  const [allowlistInput, setAllowlistInput] = useState("");

  const set = (key: keyof WizardResult, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const canNext = () => {
    if (step === 0) return form.name.trim().length >= 2 && !repoError;
    if (step === 1) return !openapiError;
    return true;
  };

  const handleRepoChange = (v: string) => {
    set("github_repo", v);
    setRepoError(validateGitHubUrl(v));
  };

  const handleOpenApiUrlChange = (v: string) => {
    set("openapi_url", v);
    setOpenapiError(validateOpenApiUrl(v));
  };

  const addDomain = () => {
    const d = allowlistInput.trim().replace(/^https?:\/\//, "").replace(/\/.*/, "");
    if (d && !form.allowlist_domains.includes(d)) {
      set("allowlist_domains", [...form.allowlist_domains, d]);
    }
    setAllowlistInput("");
  };

  const removeDomain = (d: string) =>
    set("allowlist_domains", form.allowlist_domains.filter((x) => x !== d));

  const toggleLang = (lang: string) => {
    const langs = form.sdk_languages.includes(lang)
      ? form.sdk_languages.filter((l) => l !== lang)
      : [...form.sdk_languages, lang];
    set("sdk_languages", langs);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      data-testid="project-wizard"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-bold">New Project</h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-white transition-colors text-xl"
              aria-label="Close wizard"
            >
              ✕
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {STEPS.map((label, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    i < step
                      ? "bg-green-600 text-white"
                      : i === step
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                  data-testid={`wizard-step-${i}`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  className={`text-xs ${i === step ? "text-indigo-300" : "text-gray-500"}`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 pb-4 min-h-[280px]">
          {/* Step 0: Project Info */}
          {step === 0 && (
            <div className="space-y-4" data-testid="wizard-step-project-info">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Project name <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="My API Docs"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  data-testid="wizard-name-input"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  GitHub repository URL
                </label>
                <input
                  type="url"
                  value={form.github_repo}
                  onChange={(e) => handleRepoChange(e.target.value)}
                  placeholder="https://github.com/acme/api-docs"
                  className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 ${
                    repoError ? "border-red-500" : "border-gray-600"
                  }`}
                  data-testid="wizard-repo-input"
                />
                {repoError && (
                  <p className="text-red-400 text-xs mt-1" data-testid="wizard-repo-error">
                    {repoError}
                  </p>
                )}
                {form.github_repo && !repoError && (
                  <p className="text-green-400 text-xs mt-1" data-testid="wizard-repo-valid">
                    ✓ Valid GitHub URL
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Use sample repo
                </label>
                <button
                  type="button"
                  onClick={() => {
                    handleRepoChange("https://github.com/stripe/stripe-node");
                    set("name", form.name || "Stripe Node SDK Docs");
                  }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-lg transition-colors border border-gray-600"
                  data-testid="wizard-use-sample"
                >
                  📦 Use stripe/stripe-node (sample)
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Docs & API */}
          {step === 1 && (
            <div className="space-y-4" data-testid="wizard-step-docs-api">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Docs path</label>
                <input
                  type="text"
                  value={form.docs_path}
                  onChange={(e) => set("docs_path", e.target.value)}
                  placeholder="docs"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  data-testid="wizard-docs-path-input"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Relative path to Markdown docs folder in your repo
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  OpenAPI spec path (in repo)
                </label>
                <input
                  type="text"
                  value={form.openapi_path}
                  onChange={(e) => set("openapi_path", e.target.value)}
                  placeholder="openapi.yaml"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  data-testid="wizard-openapi-path-input"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  OpenAPI spec URL (remote)
                </label>
                <input
                  type="url"
                  value={form.openapi_url}
                  onChange={(e) => handleOpenApiUrlChange(e.target.value)}
                  placeholder="https://api.example.com/openapi.json"
                  className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 ${
                    openapiError ? "border-red-500" : "border-gray-600"
                  }`}
                  data-testid="wizard-openapi-url-input"
                />
                {openapiError && (
                  <p className="text-red-400 text-xs mt-1" data-testid="wizard-openapi-url-error">
                    {openapiError}
                  </p>
                )}
                {form.openapi_url && !openapiError && (
                  <p className="text-green-400 text-xs mt-1">✓ Valid URL</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  SDK languages to check
                </label>
                <div className="flex flex-wrap gap-2">
                  {["python", "javascript", "typescript", "go", "ruby", "java"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLang(lang)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.sdk_languages.includes(lang)
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400"
                      }`}
                      data-testid={`wizard-lang-${lang}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Security */}
          {step === 2 && (
            <div className="space-y-4" data-testid="wizard-step-security">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Network allowlist
                </label>
                <p className="text-gray-500 text-xs mb-2">
                  Sandbox snippets may only call these domains. Leave empty to allow all public HTTPS.
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={allowlistInput}
                    onChange={(e) => setAllowlistInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())}
                    placeholder="api.example.com"
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    data-testid="wizard-allowlist-input"
                  />
                  <button
                    type="button"
                    onClick={addDomain}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
                    data-testid="wizard-allowlist-add"
                  >
                    Add
                  </button>
                </div>
                {form.allowlist_domains.length > 0 ? (
                  <div className="flex flex-wrap gap-2" data-testid="wizard-allowlist-tags">
                    {form.allowlist_domains.map((d) => (
                      <span
                        key={d}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-200 text-xs rounded-full"
                      >
                        {d}
                        <button
                          type="button"
                          onClick={() => removeDomain(d)}
                          className="text-gray-400 hover:text-white ml-1"
                          aria-label={`Remove ${d}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs italic">
                    No domains added — all public HTTPS allowed
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set("network_isolated", !form.network_isolated)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    form.network_isolated ? "bg-red-600" : "bg-gray-600"
                  }`}
                  data-testid="wizard-network-isolated-toggle"
                  aria-pressed={form.network_isolated}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      form.network_isolated ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm text-gray-300">Network isolation</p>
                  <p className="text-xs text-gray-500">
                    Block ALL outbound network from sandbox (most secure)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set("ci_enabled", !form.ci_enabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    form.ci_enabled ? "bg-indigo-600" : "bg-gray-600"
                  }`}
                  data-testid="wizard-ci-enabled-toggle"
                  aria-pressed={form.ci_enabled}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      form.ci_enabled ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm text-gray-300">Enable CI on push</p>
                  <p className="text-xs text-gray-500">
                    Auto-run DocsCI on every push to main branch
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-3" data-testid="wizard-step-review">
              <ReviewRow label="Project name" value={form.name} />
              <ReviewRow
                label="Repository"
                value={form.github_repo || "—"}
              />
              <ReviewRow label="Docs path" value={form.docs_path || "docs"} />
              <ReviewRow
                label="OpenAPI path"
                value={form.openapi_path || "—"}
              />
              <ReviewRow
                label="OpenAPI URL"
                value={form.openapi_url || "—"}
              />
              <ReviewRow
                label="SDK languages"
                value={
                  form.sdk_languages.length > 0
                    ? form.sdk_languages.join(", ")
                    : "All"
                }
              />
              <ReviewRow
                label="Network allowlist"
                value={
                  form.network_isolated
                    ? "Fully isolated"
                    : form.allowlist_domains.length > 0
                    ? form.allowlist_domains.join(", ")
                    : "All public HTTPS"
                }
              />
              <ReviewRow
                label="CI on push"
                value={form.ci_enabled ? "Enabled" : "Disabled"}
              />
              {error && (
                <p className="text-red-400 text-sm mt-2" data-testid="wizard-submit-error">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-700 flex justify-between">
          <button
            type="button"
            onClick={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            data-testid="wizard-back"
          >
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors font-medium"
              data-testid="wizard-next"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete(form)}
              disabled={creating}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors font-medium"
              data-testid="wizard-create"
            >
              {creating ? "Creating…" : "✓ Create project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-gray-200 truncate">{value}</span>
    </div>
  );
}
