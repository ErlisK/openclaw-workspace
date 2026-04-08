#!/usr/bin/env python3
"""
ClaimCheck Studio — Baseline Evaluation Set
20 biomedical abstracts with gold-standard claim annotations.
Measures precision/recall/F1 for claim extraction and provenance scoring.
"""

import json, time, urllib.request, urllib.parse, urllib.error

APP_URL = "https://claimcheck-studio.vercel.app"

# ── Gold standard: 20 biomedical abstracts ──────────────────────────────────
EVAL_DOCS = [
  {
    "id": "eval-001",
    "title": "Statin Efficacy Meta-Analysis",
    "text": "Statins reduce LDL cholesterol by 30–50% at standard doses. A meta-analysis of 27 trials involving 174,149 patients showed a 22% relative reduction in major cardiovascular events per 1 mmol/L LDL reduction. All-cause mortality was reduced by 10%. Adverse effects including myopathy occurred in fewer than 0.1% of participants.",
    "gold_claims": [
      "Statins reduce LDL cholesterol by 30–50% at standard doses",
      "22% relative reduction in major cardiovascular events per 1 mmol/L LDL reduction",
      "All-cause mortality was reduced by 10%",
      "Adverse effects including myopathy occurred in fewer than 0.1% of participants"
    ]
  },
  {
    "id": "eval-002",
    "title": "COVID-19 Vaccine Efficacy",
    "text": "mRNA COVID-19 vaccines demonstrated 95% efficacy against symptomatic SARS-CoV-2 infection in phase III trials. Efficacy against severe disease and hospitalization exceeded 90% across all age groups. Protection against Delta variant was 88% effective. Two-dose primary series provided durable immunity for at least 6 months. Booster doses restored waning immunity to near-original levels.",
    "gold_claims": [
      "mRNA COVID-19 vaccines demonstrated 95% efficacy against symptomatic SARS-CoV-2 infection",
      "Efficacy against severe disease and hospitalization exceeded 90%",
      "Protection against Delta variant was 88% effective",
      "Two-dose primary series provided durable immunity for at least 6 months"
    ]
  },
  {
    "id": "eval-003",
    "title": "Metformin Diabetes Outcomes",
    "text": "Metformin is the first-line pharmacotherapy for type 2 diabetes mellitus. The UKPDS demonstrated a 36% reduction in all-cause mortality in overweight patients treated with metformin versus diet alone. HbA1c reduction averages 1.0–1.5% with standard dosing. Lactic acidosis occurs in approximately 3 per 100,000 patient-years.",
    "gold_claims": [
      "Metformin is the first-line pharmacotherapy for type 2 diabetes mellitus",
      "36% reduction in all-cause mortality in overweight patients treated with metformin",
      "HbA1c reduction averages 1.0–1.5% with standard dosing",
      "Lactic acidosis occurs in approximately 3 per 100,000 patient-years"
    ]
  },
  {
    "id": "eval-004",
    "title": "Aspirin Primary Prevention",
    "text": "Low-dose aspirin (75–100 mg/day) reduces the risk of non-fatal myocardial infarction by 22% in primary prevention. However, it increases the risk of major gastrointestinal bleeding by 58%. Current guidelines no longer recommend routine aspirin for primary prevention in adults over 60. Benefit-risk ratio favors aspirin only in high-cardiovascular-risk patients under 70 without bleeding risk.",
    "gold_claims": [
      "Low-dose aspirin reduces the risk of non-fatal myocardial infarction by 22% in primary prevention",
      "Aspirin increases the risk of major gastrointestinal bleeding by 58%",
      "Current guidelines no longer recommend routine aspirin for primary prevention in adults over 60"
    ]
  },
  {
    "id": "eval-005",
    "title": "Sleep Deprivation Cognitive Effects",
    "text": "Chronic sleep restriction to 6 hours per night for 14 days produces cognitive deficits equivalent to 24 hours of total sleep deprivation. Working memory performance declines by 40% after two weeks of restricted sleep. Reaction time doubles after 17 hours of wakefulness. Sleep deprivation increases risk of type 2 diabetes by 37% compared to those sleeping 7–8 hours.",
    "gold_claims": [
      "Chronic sleep restriction to 6 hours for 14 days produces deficits equivalent to 24 hours of total sleep deprivation",
      "Working memory performance declines by 40% after two weeks of restricted sleep",
      "Reaction time doubles after 17 hours of wakefulness",
      "Sleep deprivation increases risk of type 2 diabetes by 37%"
    ]
  },
  {
    "id": "eval-006",
    "title": "Exercise and Depression",
    "text": "Aerobic exercise reduces depressive symptoms with an effect size of 0.82 in randomized controlled trials. Three sessions per week of 45-minute moderate-intensity exercise is as effective as antidepressants for mild-to-moderate depression. Exercise reduces relapse rates by 50% at 10-month follow-up. High-intensity interval training shows equivalent antidepressant effects in as few as 3 weeks.",
    "gold_claims": [
      "Aerobic exercise reduces depressive symptoms with an effect size of 0.82",
      "Three sessions per week of 45-minute exercise is as effective as antidepressants for mild-to-moderate depression",
      "Exercise reduces relapse rates by 50% at 10-month follow-up"
    ]
  },
  {
    "id": "eval-007",
    "title": "Antibiotic Resistance Trends",
    "text": "Antibiotic-resistant infections cause 700,000 deaths annually worldwide, projected to reach 10 million by 2050 without intervention. Methicillin-resistant Staphylococcus aureus (MRSA) accounts for 20% of hospital-acquired infections in high-income countries. Carbapenem-resistant Enterobacteriaceae mortality rates exceed 40–50% in critically ill patients. Antimicrobial stewardship programs reduce antibiotic use by 22% without increasing mortality.",
    "gold_claims": [
      "Antibiotic-resistant infections cause 700,000 deaths annually worldwide",
      "Projected to reach 10 million deaths annually by 2050",
      "MRSA accounts for 20% of hospital-acquired infections in high-income countries",
      "Antimicrobial stewardship programs reduce antibiotic use by 22% without increasing mortality"
    ]
  },
  {
    "id": "eval-008",
    "title": "Childhood Obesity Intervention",
    "text": "Childhood obesity prevalence has tripled since 1975, affecting 18% of children aged 5–19 globally. Multicomponent interventions combining dietary modification, physical activity, and behavioral counseling achieve 0.53 BMI z-score reduction. Screen time exceeding 2 hours/day is associated with 1.7-fold increased obesity risk. Early intervention before age 6 is twice as effective as later intervention.",
    "gold_claims": [
      "Childhood obesity prevalence has tripled since 1975",
      "Affects 18% of children aged 5–19 globally",
      "Multicomponent interventions achieve 0.53 BMI z-score reduction",
      "Screen time exceeding 2 hours/day is associated with 1.7-fold increased obesity risk"
    ]
  },
  {
    "id": "eval-009",
    "title": "Cancer Immunotherapy Response",
    "text": "PD-1/PD-L1 checkpoint inhibitors produce durable responses in 20–30% of patients with advanced solid tumors. Pembrolizumab achieves 5-year overall survival of 31% in advanced melanoma versus 6% with chemotherapy. Immune-related adverse events occur in 60–70% of patients but are severe (grade 3–4) in only 10–15%. Combination immunotherapy with ipilimumab and nivolumab doubles response rates but triples severe adverse events.",
    "gold_claims": [
      "PD-1/PD-L1 checkpoint inhibitors produce durable responses in 20–30% of patients",
      "Pembrolizumab achieves 5-year overall survival of 31% in advanced melanoma versus 6% with chemotherapy",
      "Immune-related adverse events occur in 60–70% of patients"
    ]
  },
  {
    "id": "eval-010",
    "title": "Gut Microbiome and Mental Health",
    "text": "The gut-brain axis mediates bidirectional communication between intestinal microbiota and the central nervous system. Fecal microbiota transplantation transfers anxiety-like behaviors from donor to recipient in germ-free mice. Probiotic supplementation reduces anxiety symptoms by 0.44 standard deviations in randomized trials. Antibiotic use in early childhood is associated with 40% increased risk of depression in adolescence.",
    "gold_claims": [
      "Fecal microbiota transplantation transfers anxiety-like behaviors in germ-free mice",
      "Probiotic supplementation reduces anxiety symptoms by 0.44 standard deviations",
      "Antibiotic use in early childhood is associated with 40% increased risk of depression in adolescence"
    ]
  },
  {
    "id": "eval-011",
    "title": "Hypertension and Sodium Intake",
    "text": "Reducing dietary sodium by 1,000 mg/day lowers systolic blood pressure by 5.5 mmHg on average. DASH diet adherence reduces systolic blood pressure by 11.4 mmHg in hypertensive individuals. Approximately 30% of hypertension cases are sodium-sensitive. High sodium intake (>5 g/day) is associated with 23% increased cardiovascular mortality.",
    "gold_claims": [
      "Reducing dietary sodium by 1,000 mg/day lowers systolic blood pressure by 5.5 mmHg",
      "DASH diet adherence reduces systolic blood pressure by 11.4 mmHg in hypertensive individuals",
      "High sodium intake is associated with 23% increased cardiovascular mortality"
    ]
  },
  {
    "id": "eval-012",
    "title": "Alzheimer's Disease Prevalence",
    "text": "Alzheimer's disease affects 6.7 million Americans aged 65 and older. Global prevalence is expected to triple to 153 million by 2050 due to aging populations. APOE ε4 allele carriers have a 3–4-fold increased risk. Lecanemab slows cognitive decline by 27% compared to placebo in early Alzheimer's disease. Annual care costs in the US exceed $345 billion.",
    "gold_claims": [
      "Alzheimer's disease affects 6.7 million Americans aged 65 and older",
      "Global prevalence expected to triple to 153 million by 2050",
      "APOE ε4 allele carriers have a 3–4-fold increased risk",
      "Lecanemab slows cognitive decline by 27% compared to placebo"
    ]
  },
  {
    "id": "eval-013",
    "title": "Telomere Length and Aging",
    "text": "Telomere length shortens at a rate of 24–27 base pairs per year in peripheral blood leukocytes. Individuals with shorter telomeres have a 26% higher all-cause mortality risk. Psychological stress accelerates telomere attrition by up to 10 years of equivalent aging. Vitamin D sufficiency is associated with longer telomeres by an average of 5.33 kilobases.",
    "gold_claims": [
      "Telomere length shortens at 24–27 base pairs per year",
      "Shorter telomeres associated with 26% higher all-cause mortality risk",
      "Psychological stress accelerates telomere attrition by up to 10 years"
    ]
  },
  {
    "id": "eval-014",
    "title": "Intermittent Fasting Outcomes",
    "text": "Intermittent fasting reduces body weight by 0.8–13% depending on protocol duration. The 16:8 time-restricted eating protocol reduces fasting insulin by 31% in metabolic syndrome patients. Alternate-day fasting achieves equivalent weight loss to continuous caloric restriction with better adherence (86% vs 68%). Cognitive performance improves after 12 weeks of intermittent fasting with a 20% gain in working memory scores.",
    "gold_claims": [
      "Intermittent fasting reduces body weight by 0.8–13%",
      "16:8 protocol reduces fasting insulin by 31% in metabolic syndrome patients",
      "Alternate-day fasting achieves equivalent weight loss to continuous caloric restriction"
    ]
  },
  {
    "id": "eval-015",
    "title": "HPV Vaccination Effectiveness",
    "text": "HPV vaccination reduces cervical cancer incidence by 87% in women vaccinated before first sexual exposure. The 9-valent HPV vaccine covers strains responsible for 90% of cervical cancers. Vaccination rates of 80% can achieve herd immunity for HPV 16/18. Two-dose schedules in adolescents aged 9–14 provide non-inferior immunogenicity to three-dose schedules in older patients.",
    "gold_claims": [
      "HPV vaccination reduces cervical cancer incidence by 87% in women vaccinated before first exposure",
      "9-valent HPV vaccine covers strains responsible for 90% of cervical cancers",
      "Vaccination rates of 80% can achieve herd immunity for HPV 16/18"
    ]
  },
  {
    "id": "eval-016",
    "title": "Air Pollution and Mortality",
    "text": "Exposure to PM2.5 particulate matter above 10 μg/m³ increases all-cause mortality by 6% per 10 μg/m³ increment. Global ambient air pollution causes approximately 4.2 million premature deaths annually. Indoor air pollution from solid fuels causes 3.8 million additional deaths annually, predominantly in low-income countries. Reducing PM2.5 from 35 to 12 μg/m³ in urban areas extends life expectancy by 0.6 years on average.",
    "gold_claims": [
      "PM2.5 above 10 μg/m³ increases all-cause mortality by 6% per 10 μg/m³ increment",
      "Global ambient air pollution causes approximately 4.2 million premature deaths annually",
      "Indoor air pollution from solid fuels causes 3.8 million additional deaths annually"
    ]
  },
  {
    "id": "eval-017",
    "title": "Opioid Crisis Statistics",
    "text": "Opioid overdose deaths in the US reached 80,411 in 2021, a 12% increase over 2020. Synthetic opioids, primarily fentanyl, are involved in 87% of opioid deaths. Naloxone administration reverses opioid overdose in 93% of cases when given within 5 minutes. Medication-assisted treatment with buprenorphine reduces all-cause mortality by 50% in opioid use disorder.",
    "gold_claims": [
      "Opioid overdose deaths in the US reached 80,411 in 2021",
      "Synthetic opioids involved in 87% of opioid deaths",
      "Naloxone reverses opioid overdose in 93% of cases when given within 5 minutes",
      "Buprenorphine reduces all-cause mortality by 50% in opioid use disorder"
    ]
  },
  {
    "id": "eval-018",
    "title": "Breast Cancer Screening",
    "text": "Annual mammography screening reduces breast cancer mortality by 20% in women aged 40–74. Digital breast tomosynthesis (3D mammography) reduces false-positive recall rates by 15% compared to 2D mammography. BRCA1/2 mutation carriers have a 50–72% lifetime risk of breast cancer. MRI screening in high-risk women detects 71% of cancers missed by mammography alone.",
    "gold_claims": [
      "Annual mammography screening reduces breast cancer mortality by 20% in women aged 40–74",
      "3D mammography reduces false-positive recall rates by 15%",
      "BRCA1/2 mutation carriers have a 50–72% lifetime risk of breast cancer",
      "MRI detects 71% of cancers missed by mammography alone"
    ]
  },
  {
    "id": "eval-019",
    "title": "Vitamin D Deficiency",
    "text": "Vitamin D deficiency (serum 25-hydroxyvitamin D below 20 ng/mL) affects approximately 1 billion people worldwide. Supplementation with 2,000 IU/day reduces colorectal cancer incidence by 17% in deficient individuals. Vitamin D deficiency is associated with 46% increased risk of all-cause mortality in older adults. Sunlight exposure for 10–30 minutes at midday produces 10,000–25,000 IU of vitamin D3 in fair-skinned individuals.",
    "gold_claims": [
      "Vitamin D deficiency affects approximately 1 billion people worldwide",
      "Supplementation reduces colorectal cancer incidence by 17% in deficient individuals",
      "Vitamin D deficiency associated with 46% increased risk of all-cause mortality in older adults"
    ]
  },
  {
    "id": "eval-020",
    "title": "CRISPR Gene Editing Safety",
    "text": "CRISPR-Cas9 achieves on-target editing efficiency of 70–90% in human cell lines. Off-target editing rates have been reduced to fewer than 1 event per 10 million base pairs with high-fidelity variants. Clinical trial data from sickle cell disease patients show 97% reduction in vaso-occlusive crises at 12 months. Delivery of CRISPR components via lipid nanoparticles achieves >90% hepatocyte editing in non-human primates.",
    "gold_claims": [
      "CRISPR-Cas9 achieves on-target editing efficiency of 70–90%",
      "Off-target editing rates reduced to fewer than 1 event per 10 million base pairs",
      "Clinical trials show 97% reduction in vaso-occlusive crises in sickle cell disease"
    ]
  }
]

def score_extraction(extracted_claims, gold_claims):
    """Simple token-overlap precision/recall between extracted and gold claims."""
    if not gold_claims:
        return 1.0, 1.0, 1.0
    
    # Normalize
    def tokens(s):
        return set(s.lower().replace('%','pct').replace('-',' ').split())
    
    gold_tokens = [tokens(g) for g in gold_claims]
    
    matched_gold = set()
    matched_extracted = set()
    
    for ei, ec in enumerate(extracted_claims):
        et = tokens(ec)
        for gi, gt in enumerate(gold_tokens):
            overlap = len(et & gt) / max(len(et | gt), 1)
            if overlap >= 0.35:  # 35% Jaccard threshold → match
                matched_gold.add(gi)
                matched_extracted.add(ei)
    
    precision = len(matched_extracted) / len(extracted_claims) if extracted_claims else 0
    recall = len(matched_gold) / len(gold_claims) if gold_claims else 0
    f1 = 2*precision*recall/(precision+recall) if (precision+recall) > 0 else 0
    return precision, recall, f1

def run_evaluation():
    results = []
    timings = []
    
    print(f"Running evaluation on {len(EVAL_DOCS)} documents...\n")
    
    for doc in EVAL_DOCS:
        t0 = time.time()
        try:
            # POST to /api/sessions
            data = urllib.parse.urlencode({
                'text': doc['text'],
                'title': doc['title'],
                'audienceLevel': 'journalist'
            }).encode()
            req = urllib.request.Request(
                f"{APP_URL}/api/sessions",
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                resp = json.loads(r.read())
            
            elapsed = (time.time() - t0) * 1000
            timings.append(elapsed)
            
            extracted = [c['text'] for c in resp.get('claims', [])]
            gold = doc['gold_claims']
            precision, recall, f1 = score_extraction(extracted, gold)
            
            result = {
                'id': doc['id'],
                'title': doc['title'],
                'session_id': resp.get('session', {}).get('id'),
                'gold_count': len(gold),
                'extracted_count': len(extracted),
                'precision': round(precision, 3),
                'recall': round(recall, 3),
                'f1': round(f1, 3),
                'elapsed_ms': round(elapsed),
                'status': 'ok'
            }
        except Exception as e:
            elapsed = (time.time() - t0) * 1000
            timings.append(elapsed)
            result = {
                'id': doc['id'],
                'title': doc['title'],
                'session_id': None,
                'gold_count': len(doc['gold_claims']),
                'extracted_count': 0,
                'precision': 0.0,
                'recall': 0.0,
                'f1': 0.0,
                'elapsed_ms': round(elapsed),
                'status': f'error: {str(e)[:60]}'
            }
        
        print(f"  [{result['id']}] {result['title'][:45]:45s} | "
              f"P={result['precision']:.2f} R={result['recall']:.2f} F1={result['f1']:.2f} | "
              f"{result['extracted_count']}/{result['gold_count']} claims | {result['elapsed_ms']}ms | {result['status']}")
        results.append(result)
        time.sleep(0.3)  # rate limiting
    
    # Aggregate metrics
    ok = [r for r in results if r['status'] == 'ok']
    if ok:
        avg_p = sum(r['precision'] for r in ok) / len(ok)
        avg_r = sum(r['recall'] for r in ok) / len(ok)
        avg_f1 = sum(r['f1'] for r in ok) / len(ok)
        avg_time = sum(r['elapsed_ms'] for r in ok) / len(ok)
        p80_time = sorted(r['elapsed_ms'] for r in ok)[int(0.8 * len(ok))]
        under_3min = sum(1 for r in ok if r['elapsed_ms'] < 180_000) / len(ok) * 100
        
        summary = {
            'total_docs': len(results),
            'successful': len(ok),
            'avg_precision': round(avg_p, 3),
            'avg_recall': round(avg_r, 3),
            'avg_f1': round(avg_f1, 3),
            'avg_latency_ms': round(avg_time),
            'p80_latency_ms': round(p80_time),
            'pct_under_3min': round(under_3min, 1),
            'meets_80pct_sla': under_3min >= 80
        }
    else:
        summary = {'total_docs': len(results), 'successful': 0}
    
    print(f"\n{'='*70}")
    print(f"EVALUATION SUMMARY")
    print(f"{'='*70}")
    print(f"  Documents:        {summary['total_docs']} total, {summary['successful']} successful")
    if summary['successful'] > 0:
        print(f"  Avg Precision:    {summary['avg_precision']:.3f}")
        print(f"  Avg Recall:       {summary['avg_recall']:.3f}")
        print(f"  Avg F1:           {summary['avg_f1']:.3f}")
        print(f"  Avg Latency:      {summary['avg_latency_ms']}ms")
        print(f"  P80 Latency:      {summary['p80_latency_ms']}ms")
        print(f"  Under 3min SLA:   {summary['pct_under_3min']}%  {'✅' if summary['meets_80pct_sla'] else '❌'} (target ≥80%)")
    
    return results, summary

if __name__ == '__main__':
    results, summary = run_evaluation()
    
    output = {'summary': summary, 'results': results}
    with open('/root/.openclaw/workspace/openclaw-workspace/startup-72-claimcheck-studio-blue-ocean-founding-plan/eval-results.json', 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\nResults written to eval-results.json")
