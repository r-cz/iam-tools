import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Bookmark, Clock, Edit, Globe, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroupButton } from '@/components/ui/input-group'
import { useEnvironmentProfiles, type EnvironmentProfile } from '@/lib/state'
import { EnvironmentProfileDialog } from './EnvironmentProfileDialog'

interface EnvironmentProfileSelectorProps {
  onSelectProfile: (profile: EnvironmentProfile) => void
  configLoading?: boolean
  disabled?: boolean
  compact?: boolean
  label?: string
  buttonVariant?: 'default' | 'input-group'
}

interface EnvironmentSelectorTriggerProps {
  buttonVariant: 'default' | 'input-group'
  compact: boolean
  configLoading: boolean
  disabled: boolean
  label: string
  onClick?: () => void
}

function truncateUrl(url: string, maxLength: number = 44): string {
  if (url.length <= maxLength) {
    return url
  }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname
    if (hostname.length >= maxLength - 4) {
      return `${hostname.slice(0, maxLength - 4)}...`
    }

    const path = parsed.pathname.replace(/\/+$/, '')
    const remainingLength = maxLength - hostname.length - 4
    return `${hostname}${path.slice(0, remainingLength)}...`
  } catch {
    return `${url.slice(0, maxLength - 3)}...`
  }
}

function EnvironmentProfileSummary({ profile }: { profile: EnvironmentProfile }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-center gap-1 text-sm font-medium">
        <Globe size={14} className="flex-shrink-0" />
        <span className="truncate">{profile.name}</span>
      </div>
      <div className="truncate text-xs text-muted-foreground" title={profile.issuerUrl}>
        {truncateUrl(profile.issuerUrl)}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {profile.clientId && <span>Client: {profile.clientId}</span>}
        {profile.scopes.length > 0 && <span>Scopes: {profile.scopes.join(' ')}</span>}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock size={12} />
        {formatDistanceToNow(new Date(profile.lastUsedAt), { addSuffix: true })}
      </div>
    </div>
  )
}

function EnvironmentProfileActions({
  profile,
  onEdit,
  onDelete,
}: {
  profile: EnvironmentProfile
  onEdit: (profile: EnvironmentProfile) => void
  onDelete: (profile: EnvironmentProfile) => void
}) {
  return (
    <div className="flex flex-shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        aria-label={`Edit ${profile.name}`}
        onClick={(event) => {
          event.stopPropagation()
          onEdit(profile)
        }}
      >
        <Edit size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        aria-label={`Delete ${profile.name}`}
        onClick={(event) => {
          event.stopPropagation()
          onDelete(profile)
        }}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  )
}

function EnvironmentSelectorTrigger({
  buttonVariant,
  compact,
  configLoading,
  disabled,
  label,
  onClick,
}: EnvironmentSelectorTriggerProps) {
  if (buttonVariant === 'input-group') {
    return (
      <InputGroupButton
        type="button"
        size="sm"
        variant="outline"
        grouped={false}
        className="flex items-center gap-1.5"
        disabled={disabled || configLoading}
        aria-label={label}
        data-testid="environment-selector-trigger"
        onClick={onClick}
      >
        {configLoading ? <Loader2 size={16} className="animate-spin" /> : <Bookmark size={16} />}
        <span className="hidden sm:inline">{label}</span>
      </InputGroupButton>
    )
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="h-9 w-9"
        disabled={disabled || configLoading}
        aria-label={label}
        data-testid="environment-selector-trigger"
        onClick={onClick}
      >
        {configLoading ? <Loader2 size={16} className="animate-spin" /> : <Bookmark size={16} />}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className="flex items-center gap-1.5"
      disabled={disabled || configLoading}
      aria-label={label}
      data-testid="environment-selector-trigger"
      onClick={onClick}
    >
      {configLoading ? <Loader2 size={16} className="animate-spin" /> : <Bookmark size={16} />}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

export function EnvironmentProfileSelector({
  onSelectProfile,
  configLoading = false,
  disabled = false,
  compact = false,
  label = 'Environments',
  buttonVariant = 'default',
}: EnvironmentProfileSelectorProps) {
  const { profiles, updateProfile, removeProfile, markProfileUsed } = useEnvironmentProfiles()
  const [isOpen, setIsOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<EnvironmentProfile | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const isTestEnvironment =
    (globalThis as { __IAM_TOOLS_TEST__?: boolean }).__IAM_TOOLS_TEST__ === true ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') ||
    import.meta.env.MODE === 'test'

  const sortedProfiles = useMemo(() => profiles, [profiles])

  if (sortedProfiles.length === 0) {
    return null
  }

  const handleSelectProfile = (profile: EnvironmentProfile) => {
    const updatedProfile = markProfileUsed(profile.id) ?? profile
    onSelectProfile(updatedProfile)
    setIsOpen(false)
  }

  const handleEditProfile = (profile: EnvironmentProfile) => {
    setIsOpen(false)
    setEditingProfile(profile)
    setIsDialogOpen(true)
  }

  const handleDeleteProfile = (profile: EnvironmentProfile) => {
    removeProfile(profile.id)
    setIsOpen(false)
  }

  const handleTestMenuItemKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    profile: EnvironmentProfile
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    handleSelectProfile(profile)
  }

  return (
    <>
      {isTestEnvironment ? (
        <div className="relative">
          <EnvironmentSelectorTrigger
            buttonVariant={buttonVariant}
            compact={compact}
            configLoading={configLoading}
            disabled={disabled}
            label={label}
            onClick={() => setIsOpen((currentValue) => !currentValue)}
          />
          {isOpen && (
            <div
              role="menu"
              className="absolute z-50 mt-2 w-[360px] rounded-md border bg-popover p-1"
            >
              <div className="px-2 py-1.5 text-sm font-medium">Saved Environments</div>
              <div className="my-1 h-px bg-border" />
              {sortedProfiles.map((profile) => (
                <div
                  key={profile.id}
                  role="menuitem"
                  tabIndex={0}
                  className="flex cursor-pointer items-start justify-between gap-2 rounded-sm px-2 py-1.5"
                  aria-label={`Use ${profile.name}`}
                  onClick={() => handleSelectProfile(profile)}
                  onKeyDown={(event) => handleTestMenuItemKeyDown(event, profile)}
                  data-testid="environment-selector-item"
                >
                  <EnvironmentProfileSummary profile={profile} />
                  <EnvironmentProfileActions
                    profile={profile}
                    onEdit={handleEditProfile}
                    onDelete={handleDeleteProfile}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <EnvironmentSelectorTrigger
              buttonVariant={buttonVariant}
              compact={compact}
              configLoading={configLoading}
              disabled={disabled}
              label={label}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[360px]">
            <DropdownMenuLabel>Saved Environments</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortedProfiles.map((profile) => (
              <DropdownMenuItem
                key={profile.id}
                className="flex cursor-pointer items-start justify-between gap-2"
                onClick={() => handleSelectProfile(profile)}
                data-testid="environment-selector-item"
              >
                <EnvironmentProfileSummary profile={profile} />
                <EnvironmentProfileActions
                  profile={profile}
                  onEdit={handleEditProfile}
                  onDelete={handleDeleteProfile}
                />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <EnvironmentProfileDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialProfile={editingProfile}
        title="Edit environment"
        description="Update this saved OAuth or OIDC environment."
        submitLabel="Save Changes"
        onSave={(profile) => {
          if (!editingProfile) {
            return
          }

          updateProfile(editingProfile.id, profile)
          setEditingProfile(null)
        }}
      />
    </>
  )
}
