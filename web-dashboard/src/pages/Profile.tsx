import { useState } from 'react'
import { User, Mail, Shield, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'

export default function Profile() {
  const { user, tier } = useAuth()
  const [email, setEmail] = useState(user?.email ?? '')
  const [isEditing, setIsEditing] = useState(false)

  const tierColors = {
    free: 'secondary' as const,
    pro: 'success' as const,
    enterprise: 'default' as const,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white text-xl font-bold">
                <User className="h-8 w-8" />
              </div>
              <div>
                <p className="font-medium">{user?.email}</p>
                <Badge variant={tierColors[tier] ?? 'secondary'} className="mt-1 capitalize">
                  {tier}
                </Badge>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">Member since</span>
                <span className="text-sm">{user?.created_at ? formatDate(user.created_at) : '—'}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">User ID</span>
                <span className="text-sm font-mono">{user?.id?.substring(0, 8)}...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="password" value="••••••••" disabled className="pl-9" />
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={() => setIsEditing(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={() => setIsEditing(false)}>Save Changes</Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium capitalize">{tier} Plan</p>
                <p className="text-sm text-muted-foreground">
                  {tier === 'free' ? 'No payment required' : 'Billed monthly'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/pricing'}>
              Manage Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
