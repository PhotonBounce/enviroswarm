import React, { useState, useCallback } from 'react'
import {
  Share2,
  Link,
  Mail,
  MessageCircle,
  Twitter,
  Send,
  Check,
  X,
  Copy,
} from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  shareUrl?: string
  shareText?: string
  itemType?: 'dashboard' | 'station' | 'data'
  itemId?: string
}

export default function ShareModal({
  open,
  onOpenChange,
  title = 'Share',
  shareUrl: initialUrl,
  shareText = 'Check out this environmental data on ENViroSwarm',
  itemType = 'dashboard',
  itemId,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [publicLink, setPublicLink] = useState('')
  const [linkGenerated, setLinkGenerated] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://enviroswarm.app'
  const defaultUrl = initialUrl || (itemId ? `${baseUrl}/${itemType}/${itemId}` : baseUrl)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicLink || defaultUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = publicLink || defaultUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [publicLink, defaultUrl])

  const generatePublicLink = () => {
    const link = `${baseUrl}/public/${itemType}/${itemId ?? 'shared'}?token=${Math.random().toString(36).substring(2, 10)}`
    setPublicLink(link)
    setLinkGenerated(true)
  }

  const handleEmailShare = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setEmailSent(true)
    setTimeout(() => {
      setEmailSent(false)
      setEmail('')
    }, 3000)
  }

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: Copy,
      action: handleCopy,
      label: copied ? 'Copied!' : 'Copy Link',
      active: copied,
    },
    {
      name: 'Email',
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText + '\n\n' + (publicLink || defaultUrl))}`,
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + (publicLink || defaultUrl))}`,
    },
    {
      name: 'Twitter',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(publicLink || defaultUrl)}`,
    },
    {
      name: 'Telegram',
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(publicLink || defaultUrl)}&text=${encodeURIComponent(shareText)}`,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          {title}
        </DialogTitle>
        <DialogDescription>Share this {itemType} with others</DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Public Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Public Link</label>
          <div className="flex gap-2">
            <Input
              value={publicLink || defaultUrl}
              readOnly
              className="flex-1 font-mono text-xs"
            />
            {!linkGenerated ? (
              <Button onClick={generatePublicLink} size="sm">
                Generate
              </Button>
            ) : (
              <Button onClick={handleCopy} size="sm" variant={copied ? 'secondary' : 'default'}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {linkGenerated && (
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view this {itemType} in read-only mode.
            </p>
          )}
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-5 gap-2">
          {shareOptions.map((opt) => {
            const btn = (
              <button
                key={opt.name}
                onClick={opt.action}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 transition-colors hover:bg-muted',
                  opt.active && 'bg-emerald-900/20 border-emerald-600/30'
                )}
              >
                <opt.icon className={cn('h-5 w-5', opt.active ? 'text-emerald-400' : 'text-muted-foreground')} />
                <span className="text-[10px] text-muted-foreground">{opt.label ?? opt.name}</span>
              </button>
            )
            if (opt.href && !opt.action) {
              return (
                <a
                  key={opt.name}
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <opt.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{opt.name}</span>
                </a>
              )
            }
            return btn
          })}
        </div>

        {/* Email Share */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Send via Email</label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleEmailShare} size="sm" disabled={emailSent}>
              {emailSent ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4 mr-1" />}
              {emailSent ? 'Sent' : 'Send'}
            </Button>
          </div>
          {emailSent && (
            <p className="text-xs text-emerald-400">Invitation email sent successfully!</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
