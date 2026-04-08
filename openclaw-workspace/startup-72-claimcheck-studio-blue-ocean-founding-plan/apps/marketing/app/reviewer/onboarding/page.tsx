'use client'
import { useState } from 'react'

const MODULES = [
  {
    id: 'evidence-basics',
    title: 'Evidence Hierarchy & Study Design',
    icon: '📊',
    duration: '~15 min',
    required: true,
    content: [
      {
        heading: 'The Evidence Hierarchy',
        body: 'Evidence is not equal. Different study designs have different abilities to demonstrate causality and minimize bias. The hierarchy from strongest to weakest: (1) Systematic reviews & meta-analyses, (2) Randomized controlled trials (RCTs), (3) Cohort studies, (4) Case-control studies, (5) Cross-sectional studies, (6) Case reports & expert opinion.',
      },
      {
        heading: 'GRADE Framework',
        body: 'When assessing a claim, apply GRADE (Grading of Recommendations Assessment, Development and Evaluation): High (very confident in the estimate; true effect close to estimated), Moderate (moderately confident; true effect likely close but may be substantially different), Low (limited confidence; true effect may be substantially different), Very Low (very little confidence). Downgrade for: risk of bias, inconsistency, indirectness, imprecision, publication bias.',
      },
      {
        heading: 'Common Biases to Recognize',
        body: 'Selection bias: participants not representative of target population. Confounding: a third variable explains the association. Recall bias: participants with disease remember exposures better. Publication bias: positive results more likely published. Attrition bias: differential dropout between groups.',
      },
    ],
    quiz: [
      { q: 'Which study design provides the strongest evidence for causality?', options: ['Case report', 'Cohort study', 'Randomized controlled trial', 'Expert opinion'], answer: 2 },
      { q: 'GRADE "moderate" evidence means:', options: ['Very confident in estimate', 'Moderately confident; true effect may differ substantially', 'Limited confidence', 'Very little confidence'], answer: 1 },
      { q: 'Publication bias occurs when:', options: ['Participants are not randomized', 'Positive results are more likely to be published than negative results', 'Researchers are not blinded', 'Sample size is too small'], answer: 1 },
    ],
  },
  {
    id: 'claim-extraction',
    title: 'Claim Extraction & Scope Assessment',
    icon: '🔍',
    duration: '~12 min',
    required: true,
    content: [
      {
        heading: 'Types of Scientific Claims',
        body: 'Mechanistic claims: describe how something works biologically ("Vitamin C acts as an antioxidant"). Association claims: describe statistical relationships ("Exercise is associated with reduced mortality"). Causal claims: imply direct cause-effect ("Smoking causes lung cancer"). Frequency claims: describe prevalence ("1 in 8 women will develop breast cancer"). Comparative claims: compare treatments or outcomes.',
      },
      {
        heading: 'Scope Assessment',
        body: 'Evaluate: What population does the claim apply to? What is the specific outcome? What is the timeframe? What is the comparator (if any)? A claim about "elderly adults" should be supported by evidence from elderly adults — not from young adults extrapolated backward.',
      },
      {
        heading: 'Red Flags for Unsupported Claims',
        body: '"Studies show" without citation. "Research proves" (science rarely "proves"). Overgeneralized population ("people" when evidence is from a specific group). Causation implied when only association found ("reduces risk" vs "is associated with lower risk"). Magnitude exaggeration ("dramatically reduces" when effect is modest).',
      },
    ],
    quiz: [
      { q: '"Exercise reduces all-cause mortality" is best classified as:', options: ['Mechanistic claim', 'Population-level association claim', 'Individual treatment claim', 'Qualitative claim'], answer: 1 },
      { q: 'When a claim says "studies show X" without citation:', options: ['Accept as likely true', 'Flag as unsupported — requires specific citation', 'Reject immediately', 'Ignore'], answer: 1 },
      { q: 'A claim about "adults with type 2 diabetes aged 40–65" should be supported by:', options: ['Any adult population study', 'Evidence matching the specific population described', 'Children\'s studies if dose-adjusted', 'Animal studies'], answer: 1 },
    ],
  },
  {
    id: 'compliance-rules',
    title: 'FTC, FDA & Health Claim Compliance',
    icon: '⚖️',
    duration: '~18 min',
    required: true,
    content: [
      {
        heading: 'FTC Health Claim Requirements',
        body: 'Under FTC guidelines, health claims must be: (1) Truthful — not false or misleading, (2) Substantiated — supported by competent and reliable scientific evidence, (3) Clear and conspicuous — qualifications must be visible. The FTC requires that implied claims (not just explicit ones) also be substantiated.',
      },
      {
        heading: 'FDA Health Claim Categories',
        body: 'Authorized health claims: pre-approved by FDA, based on significant scientific agreement (e.g., "Diets low in saturated fat reduce heart disease risk"). Qualified health claims: permitted with qualifying language when evidence is suggestive but not conclusive. Structure/function claims: describe how a nutrient affects the body — do not require FDA approval but cannot imply treatment of disease. Drug claims: imply treatment, cure, or prevention of a disease — only permitted for FDA-approved drugs.',
      },
      {
        heading: 'EU Regulation 1924/2006',
        body: 'EU regulates nutrition and health claims more strictly than the US. All health claims must be authorized and listed in the EU Register. Claims about reducing disease risk require specific authorization. "May help" and "contributes to" formulations are scrutinized carefully. Check the EU Nutrition and Health Claims Register before approving any EU-facing content.',
      },
    ],
    quiz: [
      { q: 'Under FTC guidelines, health claims must be:', options: ['Reviewed by an attorney', 'Truthful, not misleading, and substantiated', 'Reviewed by FDA before publishing', 'Only from peer-reviewed journals'], answer: 1 },
      { q: 'An authorized health claim in the US requires:', options: ['Company self-certification', 'FDA pre-approval based on significant scientific agreement', 'FTC registration', 'None of the above'], answer: 1 },
      { q: 'A claim that a supplement "cures" a disease is:', options: ['A structure/function claim', 'An authorized health claim', 'A drug claim — illegal without FDA approval', 'A nutrient content claim'], answer: 2 },
    ],
  },
]

type Step = 'intro' | 'content' | 'quiz' | 'result'

export default function OnboardingPage() {
  const [moduleIdx, setModuleIdx] = useState(0)
  const [step, setStep] = useState<Step>('intro')
  const [contentPage, setContentPage] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [completedModules, setCompletedModules] = useState<string[]>([])

  const mod = MODULES[moduleIdx]
  const isLastModule = moduleIdx === MODULES.length - 1
  const allDone = completedModules.length === MODULES.length

  function submitQuiz() {
    setSubmitted(true)
    setStep('result')
  }

  function nextModule() {
    if (!completedModules.includes(mod.id)) {
      setCompletedModules([...completedModules, mod.id])
    }
    if (!isLastModule) {
      setModuleIdx(moduleIdx + 1)
      setStep('intro')
      setContentPage(0)
      setAnswers([])
      setSubmitted(false)
    }
  }

  const correctAnswers = MODULES[moduleIdx].quiz.filter((q, i) => answers[i] === q.answer).length
  const score = mod.quiz.length > 0 ? Math.round(correctAnswers / mod.quiz.length * 100) : 100
  const passed = score >= 75

  if (allDone) {
    return (
      <div className="pt-14 min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-3">Onboarding Complete!</h2>
          <p className="text-gray-400 mb-6">You've completed all required training modules. Your next step is the calibration assessment — 5 real claim-verification tasks scored against expert verdicts.</p>
          <a href="/reviewer/calibration" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">
            Start calibration →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {MODULES.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                  completedModules.includes(m.id) ? 'bg-emerald-900/40 border-emerald-600 text-emerald-400' :
                  i === moduleIdx ? 'bg-blue-900/40 border-blue-600 text-blue-400' :
                  'border-gray-700 text-gray-600'}`}>
                  {completedModules.includes(m.id) ? '✓' : i + 1}
                </div>
                {i < MODULES.length - 1 && <div className={`w-8 h-px ${completedModules.includes(m.id) ? 'bg-emerald-600' : 'bg-gray-700'}`} />}
              </div>
            ))}
            <span className="text-xs text-gray-500 ml-2">{completedModules.length}/{MODULES.length} modules complete</span>
          </div>
        </div>

        {/* Module card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">

          {/* Module header */}
          <div className="border-b border-gray-800 p-5 flex items-center gap-3">
            <span className="text-3xl">{mod.icon}</span>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Module {moduleIdx + 1} of {MODULES.length}</div>
              <h2 className="text-lg font-bold text-white">{mod.title}</h2>
            </div>
            <div className="ml-auto text-xs text-gray-600">{mod.duration}</div>
          </div>

          {/* INTRO step */}
          {step === 'intro' && (
            <div className="p-6">
              <p className="text-gray-400 mb-6">This module covers key concepts you need to verify health and science claims accurately. Read each section, then take the quiz to unlock the next module.</p>
              <div className="space-y-2 mb-6">
                {mod.content.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="text-blue-400">▸</span> {s.heading}
                  </div>
                ))}
              </div>
              <button onClick={() => setStep('content')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium">
                Start module →
              </button>
            </div>
          )}

          {/* CONTENT step */}
          {step === 'content' && (
            <div className="p-6">
              <div className="text-xs text-gray-500 mb-4">{contentPage + 1} of {mod.content.length}</div>
              <h3 className="text-base font-semibold text-white mb-3">{mod.content[contentPage].heading}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">{mod.content[contentPage].body}</p>
              <div className="flex gap-3">
                {contentPage > 0 && (
                  <button onClick={() => setContentPage(contentPage - 1)}
                    className="px-4 py-2 border border-gray-700 text-gray-400 text-sm rounded-lg">← Back</button>
                )}
                {contentPage < mod.content.length - 1 ? (
                  <button onClick={() => setContentPage(contentPage + 1)}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">Next →</button>
                ) : (
                  <button onClick={() => { setStep('quiz'); setAnswers([]) }}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded-lg font-medium">Take quiz →</button>
                )}
              </div>
            </div>
          )}

          {/* QUIZ step */}
          {step === 'quiz' && (
            <div className="p-6">
              <div className="text-sm font-semibold text-white mb-4">Quiz — {mod.quiz.length} questions</div>
              <div className="space-y-5">
                {mod.quiz.map((q, qi) => (
                  <div key={qi} className="rounded-lg border border-gray-800 bg-gray-800/40 p-4">
                    <div className="text-sm text-gray-200 mb-3">{qi + 1}. {q.q}</div>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                          answers[qi] === oi ? 'border-blue-600 bg-blue-950/40' : 'border-gray-700 hover:border-gray-600'}`}>
                          <input type="radio" name={`q${qi}`} value={oi} checked={answers[qi] === oi}
                            onChange={() => { const a = [...answers]; a[qi] = oi; setAnswers(a) }}
                            className="text-blue-600" />
                          <span className="text-sm text-gray-300">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={submitQuiz} disabled={answers.length < mod.quiz.length || answers.some(a => a === undefined)}
                className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium">
                Submit quiz
              </button>
            </div>
          )}

          {/* RESULT step */}
          {step === 'result' && (
            <div className="p-6">
              <div className={`text-4xl mb-2 ${passed ? '🎉' : '🔄'}`}>{passed ? '🎉' : '🔄'}</div>
              <h3 className={`text-xl font-bold mb-1 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {passed ? 'Passed!' : 'Almost there!'}
              </h3>
              <div className="text-sm text-gray-400 mb-4">Score: {correctAnswers}/{mod.quiz.length} ({score}%) · Passing: 75%</div>

              <div className="space-y-3 mb-5">
                {mod.quiz.map((q, qi) => (
                  <div key={qi} className={`rounded-lg border p-3 text-xs ${
                    answers[qi] === q.answer ? 'border-emerald-800/40 bg-emerald-950/20' : 'border-red-800/40 bg-red-950/20'}`}>
                    <div className="text-gray-300 mb-1">{q.q}</div>
                    <div className="text-gray-500">Your answer: <span className={answers[qi] === q.answer ? 'text-emerald-400' : 'text-red-400'}>{q.options[answers[qi]]}</span></div>
                    {answers[qi] !== q.answer && (
                      <div className="text-gray-500">Correct: <span className="text-emerald-400">{q.options[q.answer]}</span></div>
                    )}
                  </div>
                ))}
              </div>

              {passed ? (
                <button onClick={nextModule}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded-lg font-medium">
                  {isLastModule ? 'Complete onboarding →' : 'Next module →'}
                </button>
              ) : (
                <button onClick={() => { setStep('content'); setContentPage(0); setAnswers([]); setSubmitted(false) }}
                  className="px-5 py-2.5 border border-gray-600 text-gray-300 text-sm rounded-lg hover:border-gray-400">
                  Review content & retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
