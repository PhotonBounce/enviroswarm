import { Check, Zap, Bitcoin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { usePricing, useSubscribe } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import CryptoPaymentModal from '@/components/CryptoPaymentModal'

export default function Pricing() {
  const { data: pricingTiers } = usePricing()
  const subscribe = useSubscribe()
  const { tier } = useAuth()
  const [pendingTier, setPendingTier] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false)
  const [cryptoTier, setCryptoTier] = useState({ tier: '', name: '' })

  const tiers = pricingTiers ?? [
    {
      name: 'Free',
      tier: 'free' as const,
      price: 0,
      description: 'Get started with basic monitoring',
      features: ['1 sensor station', '100 readings/day', '7-day data retention', 'Basic charts', 'Email support'],
    },
    {
      name: 'Pro',
      tier: 'pro' as const,
      price: 29,
      description: 'For serious environmental monitoring',
      features: ['10 sensor stations', '10,000 readings/day', '90-day data retention', 'Advanced charts & exports', '1 API key', 'Priority support'],
    },
    {
      name: 'Enterprise',
      tier: 'enterprise' as const,
      price: 299,
      description: 'For organizations and research teams',
      features: ['Unlimited stations', 'Unlimited readings', '2-year data retention', 'Bulk data exports', '10 API keys', 'SLA support', 'Custom integrations'],
    },
  ]

  const handleSubscribe = async (targetTier: string) => {
    setPendingTier(targetTier)
    setToast(null)
    try {
      await subscribe.mutateAsync(targetTier)
      setToast({ type: 'success', message: 'Subscription updated! (Mock checkout for MVP)' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Subscription failed. Please try again.'
      setToast({ type: 'error', message })
    } finally {
      setPendingTier(null)
    }
  }

  const openCryptoPayment = (tierId: string, tierName: string) => {
    setCryptoTier({ tier: tierId, name: tierName })
    setCryptoModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Pricing</h1>
        <p className="text-muted-foreground">Choose the plan that fits your monitoring needs</p>
      </div>

      {toast && (
        <div role={toast.type === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${toast.type === 'success' ? 'border-emerald-600/30 bg-emerald-900/20 text-emerald-400' : 'border-red-600/30 bg-red-900/20 text-red-400'}`}>
          {toast.message}
        </div>
      )}

      {/* Free Trial Banner */}
      <div className="rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 p-6 text-white text-center shadow-lg">
        <Zap className="h-8 w-8 mx-auto mb-2" />
        <h2 className="text-xl font-bold">Start with 7 Days Free</h2>
        <p className="text-sm opacity-90 mt-1">
          All new accounts get full Enterprise access for 7 days. No credit card required.
        </p>
        <p className="text-xs opacity-80 mt-2">
          After 7 days, you can stay on Free or upgrade to Pro/Enterprise.
        </p>
      </div>

      {/* Crypto Payment Banner */}
      <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white text-center shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Bitcoin className="h-5 w-5" />
          <span className="font-bold">Now Accepting Crypto</span>
        </div>
        <p className="text-sm opacity-90">
          Pay with ETH, BTC, SOL, TRX, BNB, MATIC, and more across 10+ chains.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((t: typeof tiers[0]) => {
          const isCurrent = tier === t.tier
          const isPending = pendingTier === t.tier
          const showCrypto = t.tier !== 'free'
          return (
            <Card
              key={t.tier}
              className={cn(
                'relative flex flex-col',
                t.tier === 'pro' && 'border-teal-500/50 shadow-teal-900/20'
              )}
            >
              {t.tier === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="success" className="px-3">
                    <Zap className="mr-1 h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle>{t.name}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${t.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {t.features.map((feature: string, index: number) => (
                    <li key={`${t.tier}-${feature}-${index}`} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-teal-400 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 space-y-2">
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : t.tier === 'pro' ? 'default' : 'outline'}
                    disabled={isCurrent || isPending}
                    onClick={() => handleSubscribe(t.tier)}
                  >
                    {isCurrent ? 'Current Plan' : isPending ? 'Processing...' : 'Subscribe'}
                  </Button>
                  {showCrypto && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => openCryptoPayment(t.tier, t.name)}
                    >
                      <Bitcoin className="mr-2 h-4 w-4" />
                      Pay with Crypto
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Supported Chains */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-center mb-4">Supported Blockchains</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: 'Ethereum', color: '#627EEA', abbr: 'ETH' },
              { name: 'Bitcoin', color: '#F7931A', abbr: 'BTC' },
              { name: 'Solana', color: '#9945FF', abbr: 'SOL' },
              { name: 'Tron', color: '#FF060A', abbr: 'TRX' },
              { name: 'BNB', color: '#F3BA2F', abbr: 'BNB' },
              { name: 'Polygon', color: '#8247E5', abbr: 'MATIC' },
              { name: 'Linea', color: '#121212', abbr: 'Linea' },
              { name: 'Base', color: '#0052FF', abbr: 'Base' },
              { name: 'Arbitrum', color: '#28A0F0', abbr: 'ARB' },
              { name: 'Optimism', color: '#FF0420', abbr: 'OP' },
            ].map((chain) => (
              <div
                key={chain.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${chain.color}15`,
                  color: chain.color,
                  border: `1px solid ${chain.color}30`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: chain.color }}
                />
                {chain.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <h3 className="text-lg font-semibold">Need a custom plan?</h3>
              <p className="text-sm text-muted-foreground">
                Contact us for data licensing, bulk exports, and custom SLA agreements.
              </p>
            </div>
            <a
              href="mailto:sales@enviroswarm.example.com?subject=Enterprise%20Inquiry"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Contact Sales
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Crypto Payment Modal */}
      <CryptoPaymentModal
        isOpen={cryptoModalOpen}
        onClose={() => setCryptoModalOpen(false)}
        tier={cryptoTier.tier}
        tierName={cryptoTier.name}
      />
    </div>
  )
}
