import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Wind,
  Volume2,
  Sun,
  Droplets,
  Radio,
  Thermometer,
  ArrowRight,
  Shield,
  Activity,
  BarChart3,
  Users,
  ChevronDown,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import AQIGauge from '@/components/pollution/AQIGauge'
import { demoAQIHistory, getAQIClass, getAQILabel, getAQIColor } from '@/lib/demoData'
import { cn } from '@/lib/utils'

const pollutionTypes = [
  {
    title: 'Air Quality',
    icon: Wind,
    description: 'Track PM2.5, PM10, CO₂, VOCs, NO₂, and O₃ in real-time.',
    color: '#22c55e',
    aqi: 52,
  },
  {
    title: 'Noise Pollution',
    icon: Volume2,
    description: 'Monitor decibel levels from traffic, construction, and industry.',
    color: '#8b5cf6',
    aqi: 85,
  },
  {
    title: 'Light Pollution',
    icon: Sun,
    description: 'Measure urban light intensity and its impact on ecosystems.',
    color: '#eab308',
    aqi: 110,
  },
  {
    title: 'Water Quality',
    icon: Droplets,
    description: 'Analyze pH, turbidity, dissolved oxygen, and contaminants.',
    color: '#06b6d4',
    aqi: 38,
  },
  {
    title: 'Radiation',
    icon: Radio,
    description: 'Detect background radiation levels and anomalies.',
    color: '#ef4444',
    aqi: 22,
  },
  {
    title: 'Thermal',
    icon: Thermometer,
    description: 'Map urban heat islands and thermal stress zones.',
    color: '#f97316',
    aqi: 78,
  },
]

const features = [
  {
    title: 'Real-time Monitoring',
    description: 'Live data streams from thousands of community and professional sensors.',
    icon: Activity,
  },
  {
    title: 'Health Alerts',
    description: 'Get notified when pollution levels threaten your health or safety.',
    icon: Shield,
  },
  {
    title: 'Scientific Tools',
    description: 'Advanced analytics, trend analysis, and data export for researchers.',
    icon: BarChart3,
  },
  {
    title: 'Community Data',
    description: 'Crowdsourced pollution reports from a global network of citizens.',
    icon: Users,
  },
]

export default function LandingPage() {
  const [liveAQI, setLiveAQI] = useState(45)
  const [liveLabel, setLiveLabel] = useState('Good')
  const [liveColor, setLiveColor] = useState('#22c55e')

  useEffect(() => {
    const interval = setInterval(() => {
      const randomAQI = Math.round(35 + Math.random() * 80)
      setLiveAQI(randomAQI)
      setLiveLabel(getAQILabel(randomAQI))
      setLiveColor(getAQIColor(randomAQI))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                <Shield className="h-4 w-4" />
                Pollution Detection & Environmental Science
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Know Your Air.
                <br />
                <span className="text-gradient">Protect Your Health.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl">
                Real-time pollution monitoring, health alerts, and scientific analytics for communities, researchers, and environmental agencies.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/data">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                    Try Demo Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" onClick={scrollToFeatures}>
                  Learn More
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <GlassCard className="p-8 w-full max-w-sm">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Live AQI Demo</h3>
                  <p className="text-sm text-muted-foreground">Real-time air quality index</p>
                </div>
                <AQIGauge aqi={liveAQI} size={200} />
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">Current status:</p>
                  <p className="text-lg font-bold" style={{ color: liveColor }}>
                    {liveLabel}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {demoAQIHistory.slice(-3).map((d, i) => (
                    <div key={i} className="rounded-md bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.timestamp).getHours()}:00
                      </p>
                      <p className={cn('text-sm font-bold', getAQIClass(d.aqi))}>
                        {d.aqi}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pollution Type Cards */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight">Monitor Every Pollutant</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comprehensive coverage of environmental hazards that affect human health.
            </p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pollutionTypes.map((type, index) => {
              const Icon = type.icon
              return (
                <motion.div
                  key={type.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <GlassCard className="p-6 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: type.color }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="text-right">
                        <span className={cn('text-sm font-bold', getAQIClass(type.aqi))}>
                          AQI {type.aqi}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{type.title}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="px-4 py-16 sm:px-6 lg:px-8 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight">Built for Science & Safety</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful tools for researchers, public health officials, and concerned citizens.
            </p>
          </motion.div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 px-6 py-12 text-center sm:px-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                Air Quality Alert: Take Action Now
              </h2>
              <p className="text-white/80 max-w-2xl mx-auto mb-8">
                Join thousands of scientists and citizens monitoring pollution in real-time. Get alerts when air quality threatens your health.
              </p>
              <Link to="/data">
                <Button
                  size="lg"
                  className="gap-2 bg-white text-red-600 hover:bg-white/90 font-semibold"
                >
                  Try Demo Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
