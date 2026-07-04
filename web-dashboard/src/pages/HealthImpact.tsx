import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Heart,
  Baby,
  PersonStanding,
  Wind,
  Activity,
  Skull,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import WHOGuidelines from '@/components/pollution/WHOGuidelines'
import { getAQIColor } from '@/lib/demoData'
import { cn } from '@/lib/utils'

interface HealthEffect {
  pollutant: string
  shortTerm: string[]
  longTerm: string[]
  color: string
}

const healthEffects: HealthEffect[] = [
  {
    pollutant: 'PM2.5 (Fine Particulates)',
    shortTerm: ['Eye, nose, and throat irritation', 'Coughing and sneezing', 'Shortness of breath'],
    longTerm: ['Reduced lung function', 'Chronic bronchitis', 'Heart disease', 'Lung cancer', 'Premature death'],
    color: '#f97316',
  },
  {
    pollutant: 'PM10 (Coarse Particulates)',
    shortTerm: ['Nasal congestion', 'Throat irritation', 'Chest tightness'],
    longTerm: ['Decreased lung function', 'Asthma exacerbation', 'Cardiovascular effects'],
    color: '#ec4899',
  },
  {
    pollutant: 'Ozone (O₃)',
    shortTerm: ['Throat irritation', 'Coughing', 'Chest pain', 'Reduced lung function'],
    longTerm: ['Asthma development', 'Permanent lung damage', 'Premature mortality'],
    color: '#22c55e',
  },
  {
    pollutant: 'Nitrogen Dioxide (NO₂)',
    shortTerm: ['Inflammation of airways', 'Increased bronchial reactivity', 'Reduced immunity to infection'],
    longTerm: ['Chronic lung disease', 'Cardiovascular effects', 'Childhood asthma development'],
    color: '#3b82f6',
  },
  {
    pollutant: 'Carbon Monoxide (CO)',
    shortTerm: ['Headaches', 'Dizziness', 'Reduced oxygen delivery to organs'],
    longTerm: ['Heart disease', 'Neurological damage', 'Fetal development issues'],
    color: '#6b7280',
  },
  {
    pollutant: 'Sulfur Dioxide (SO₂)',
    shortTerm: ['Bronchoconstriction', 'Asthma attacks', 'Wheezing', 'Chest tightness'],
    longTerm: ['Respiratory disease', 'Cardiovascular disease'],
    color: '#eab308',
  },
  {
    pollutant: 'Volatile Organic Compounds (VOCs)',
    shortTerm: ['Eye irritation', 'Nausea', 'Fatigue', 'Dizziness', 'Skin problems'],
    longTerm: ['Liver and kidney damage', 'Central nervous system damage', 'Cancer risk'],
    color: '#84cc16',
  },
]

interface SensitiveGroup {
  group: string
  icon: typeof Heart
  risks: string[]
  advice: string
}

const sensitiveGroups: SensitiveGroup[] = [
  {
    group: 'Children',
    icon: Baby,
    risks: ['Developing lungs are more susceptible to damage', 'Higher respiratory rates absorb more pollutants', 'Increased asthma risk'],
    advice: 'Keep children indoors when AQI > 100. Use air purifiers at home and in schools.',
  },
  {
    group: 'Elderly',
    icon: PersonStanding,
    risks: ['Pre-existing heart and lung conditions', 'Weaker immune systems', 'Reduced ability to cope with stress'],
    advice: 'Limit outdoor activities when AQI > 100. Keep medications accessible and monitor symptoms.',
  },
  {
    group: 'Asthma & COPD Patients',
    icon: Wind,
    risks: ['Airway inflammation triggers attacks', 'Reduced lung function during episodes', 'Emergency room visits increase'],
    advice: 'Always carry rescue inhalers. Avoid outdoor exertion when AQI > 50. Pre-treat before going out.',
  },
  {
    group: 'Cardiovascular Disease',
    icon: Heart,
    risks: ['Inflammation increases clot risk', 'Arrhythmia triggers', 'Heart attack risk during high pollution days'],
    advice: 'Monitor heart rate and blood pressure. Avoid strenuous outdoor activity when AQI > 75.',
  },
  {
    group: 'Pregnant Women',
    icon: Baby,
    risks: ['Low birth weight risk', 'Preterm birth association', 'Developmental impacts on fetus'],
    advice: 'Minimize exposure to high traffic areas. Use N95 masks when AQI > 100. Ensure good indoor ventilation.',
  },
  {
    group: 'Outdoor Workers',
    icon: Activity,
    risks: ['Chronic exposure increases cancer risk', 'Respiratory disease', 'Heat stress combined with poor air quality'],
    advice: 'Schedule heavy work for early morning. Use respiratory protection when AQI > 100. Take frequent breaks indoors.',
  },
]

const longTermRisks = [
  {
    title: 'Cardiovascular Disease',
    description: 'Long-term exposure to PM2.5 increases risk of heart attacks, strokes, and hypertension. Fine particles can enter the bloodstream, causing systemic inflammation.',
    severity: 'High',
    color: '#ef4444',
  },
  {
    title: 'Lung Cancer',
    description: 'The IARC classifies PM2.5 as carcinogenic to humans. Sustained exposure significantly increases lung cancer risk, even in non-smokers.',
    severity: 'Critical',
    color: '#7f1d1d',
  },
  {
    title: 'Chronic Respiratory Disease',
    description: 'Persistent exposure leads to COPD, chronic bronchitis, and reduced lung function that may not be fully reversible.',
    severity: 'High',
    color: '#ef4444',
  },
  {
    title: 'Neurological Effects',
    description: 'Emerging research links PM2.5 exposure to cognitive decline, dementia, and Alzheimer\'s disease through neuroinflammation.',
    severity: 'Moderate',
    color: '#f97316',
  },
  {
    title: 'Reproductive & Developmental',
    description: 'Air pollution is associated with low birth weight, preterm birth, and developmental impacts in children including reduced lung growth.',
    severity: 'Moderate',
    color: '#f97316',
  },
  {
    title: 'Diabetes',
    description: 'Evidence suggests long-term pollution exposure increases insulin resistance and type 2 diabetes risk through inflammatory pathways.',
    severity: 'Moderate',
    color: '#f97316',
  },
]

function RiskBadge({ severity, color }: { severity: string; color: string }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {severity} Risk
    </span>
  )
}

export default function HealthImpact() {
  const [expandedEffect, setExpandedEffect] = useState<number | null>(0)
  const [expandedGroup, setExpandedGroup] = useState<number | null>(0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Health Impact</h1>
        <p className="text-muted-foreground">Understanding the health effects of air pollution exposure</p>
      </div>

      {/* WHO Guidelines */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          WHO Air Quality Guidelines
        </h2>
        <GlassCard className="p-4">
          <WHOGuidelines />
        </GlassCard>
      </section>

      {/* Health Effects by Pollutant */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Wind className="h-5 w-5 text-primary" />
          Health Effects by Pollutant
        </h2>
        <div className="space-y-3">
          {healthEffects.map((effect, index) => (
            <GlassCard key={effect.pollutant} className="p-0 overflow-hidden">
              <button
                onClick={() => setExpandedEffect(expandedEffect === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: effect.color }}
                  />
                  <span className="font-semibold text-sm">{effect.pollutant}</span>
                </div>
                {expandedEffect === index ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedEffect === index && (
                <motion.div
                  className="px-4 pb-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Short-term Effects
                      </h4>
                      <ul className="space-y-1">
                        {effect.shortTerm.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Long-term Effects
                      </h4>
                      <ul className="space-y-1">
                        {effect.longTerm.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Sensitive Groups */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Sensitive Groups Advice
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sensitiveGroups.map((group, index) => {
            const Icon = group.icon
            return (
              <motion.div
                key={group.group}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-4 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm">{group.group}</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Risks</p>
                      <ul className="space-y-1">
                        {group.risks.map((risk) => (
                          <li key={risk} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <span className="mt-1 h-1 w-1 rounded-full bg-red-400 shrink-0" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-md bg-primary/5 p-2">
                      <p className="text-xs font-semibold text-primary mb-0.5">Advice</p>
                      <p className="text-xs text-muted-foreground">{group.advice}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Long-term Exposure Risks */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Skull className="h-5 w-5 text-primary" />
          Long-term Exposure Risks
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {longTermRisks.map((risk, index) => (
            <motion.div
              key={risk.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{risk.title}</h3>
                  <RiskBadge severity={risk.severity} color={risk.color} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{risk.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* References */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          References
        </h2>
        <GlassCard className="p-4">
          <ul className="space-y-2">
            <li>
              <a
                href="https://www.who.int/publications/i/item/9789240034228"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                WHO Air Quality Guidelines (2021) — Global Air Quality Guidelines
              </a>
            </li>
            <li>
              <a
                href="https://www.epa.gov/pm-pollution/particulate-matter-pm-basics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                US EPA — Particulate Matter (PM) Basics
              </a>
            </li>
            <li>
              <a
                href="https://www.epa.gov/ozone-pollution/ground-level-ozone-basics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                US EPA — Ground-level Ozone Basics
              </a>
            </li>
            <li>
              <a
                href="https://www.who.int/health-topics/air-pollution"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                WHO — Air Pollution Health Topics
              </a>
            </li>
            <li>
              <a
                href="https://www.iarc.who.int/wp-content/uploads/2018/07/pr221_E.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                IARC — Outdoor Air Pollution and Cancer (Press Release 221)
              </a>
            </li>
          </ul>
        </GlassCard>
      </section>
    </div>
  )
}
