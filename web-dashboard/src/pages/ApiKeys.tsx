import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, Plus, Copy, Trash2, AlertTriangle, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import type { ApiKey } from '@/types'
import { formatDate } from '@/lib/utils'

export default function ApiKeys() {
  const { tier } = useAuth()
  const navigate = useNavigate()
  const { data: apiKeys, isLoading } = useApiKeys()
  const createApiKey = useCreateApiKey()
  const deleteApiKey = useDeleteApiKey()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const canManageKeys = tier === 'pro' || tier === 'enterprise'

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) return
    try {
      const result = await createApiKey.mutateAsync(keyName.trim())
      setNewKey(result.key_hash)
      setKeyName('')
    } catch {
      // error handled by mutation
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return
    await deleteApiKey.mutateAsync(id)
  }

  const handleCopy = async (key: string, id: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Clipboard permission denied
    }
  }

  if (!canManageKeys) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">Manage your API keys for programmatic access</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
            <h3 className="text-lg font-semibold">Pro Feature</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
              API key management is available on Pro and Enterprise tiers. Upgrade to generate and manage API keys for programmatic access to your data.
            </p>
            <Button className="mt-6" onClick={() => navigate('/pricing')}>
              View Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">Manage keys for programmatic access</p>
        </div>
        <Button onClick={() => { setDialogOpen(true); setNewKey(null) }}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Key
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading keys...</div>
      ) : apiKeys && apiKeys.length > 0 ? (
        <div className="space-y-3">
          {apiKeys.map((key: ApiKey) => (
            <Card key={key.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium">{key.name}</span>
                    <Badge variant="outline">{key.rate_limit_per_min}/min</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {key.key_hash?.substring(0, 8) ?? ''}...{key.key_hash?.substring(key.key_hash.length - 8) ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(key.created_at)}
                    {key.last_used_at && ` · Last used ${formatDate(key.last_used_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleCopy(key.key_hash, key.id)}>
                    {copiedId === key.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(key.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No API keys yet</p>
            <p className="text-sm text-muted-foreground">Generate your first key to get started</p>
          </CardContent>
        </Card>
      )}

      {dialogOpen && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>Create a new API key for programmatic access</DialogDescription>
          </DialogHeader>
          {newKey ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-600/30 bg-emerald-900/20 p-4">
                <p className="text-sm font-medium text-emerald-400 mb-2">Your new API key:</p>
                <code className="block break-all rounded bg-muted p-2 text-xs font-mono">{newKey}</code>
                <p className="text-xs text-muted-foreground mt-2">
                  Copy this now — you won&apos;t be able to see it again.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => handleCopy(newKey, 'new')}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </Button>
                <Button variant="outline" onClick={() => { setDialogOpen(false); setNewKey(null) }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Name</label>
                <Input value={keyName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyName(e.target.value)} placeholder="e.g. Production App" required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createApiKey.isPending}>
                  {createApiKey.isPending ? 'Generating...' : 'Generate'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </Dialog>
      )}
    </div>
  )
}
