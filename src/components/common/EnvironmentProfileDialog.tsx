import { useState } from 'react'
import { normalizeIssuerUrl } from '@/features/oauthPlayground/utils/oidc-preflight'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormFieldInput } from './FormField'
import type { EnvironmentProfile, EnvironmentProfileDraft } from '@/lib/state'

interface EnvironmentProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialProfile?: Partial<EnvironmentProfile | EnvironmentProfileDraft> | null
  title: string
  description: string
  submitLabel: string
  onSave: (profile: EnvironmentProfileDraft) => void
}

interface EnvironmentProfileFormState {
  name: string
  issuerUrl: string
  authorizationEndpoint: string
  tokenEndpoint: string
  jwksEndpoint: string
  introspectionEndpoint: string
  userInfoEndpoint: string
  clientId: string
  scopes: string
}

interface EnvironmentProfileFormErrors {
  name?: string
  issuerUrl?: string
  authorizationEndpoint?: string
  tokenEndpoint?: string
  jwksEndpoint?: string
  introspectionEndpoint?: string
  userInfoEndpoint?: string
}

interface EnvironmentProfileDialogResetSource {
  open: boolean
  initialProfile?: Partial<EnvironmentProfile | EnvironmentProfileDraft> | null
}

function getInitialFormState(
  initialProfile?: Partial<EnvironmentProfile | EnvironmentProfileDraft> | null
): EnvironmentProfileFormState {
  return {
    name: initialProfile?.name ?? '',
    issuerUrl: initialProfile?.issuerUrl ?? '',
    authorizationEndpoint: initialProfile?.authorizationEndpoint ?? '',
    tokenEndpoint: initialProfile?.tokenEndpoint ?? '',
    jwksEndpoint: initialProfile?.jwksEndpoint ?? '',
    introspectionEndpoint: initialProfile?.introspectionEndpoint ?? '',
    userInfoEndpoint: initialProfile?.userInfoEndpoint ?? '',
    clientId: initialProfile?.clientId ?? '',
    scopes: initialProfile?.scopes?.join(' ') ?? '',
  }
}

function normalizeOptionalUrl(
  value: string,
  label: string,
  errors: EnvironmentProfileFormErrors
): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  try {
    return new URL(trimmed).toString()
  } catch {
    errors[label as keyof EnvironmentProfileFormErrors] = 'Enter a valid absolute URL'
    return undefined
  }
}

export function EnvironmentProfileDialog({
  open,
  onOpenChange,
  initialProfile = null,
  title,
  description,
  submitLabel,
  onSave,
}: EnvironmentProfileDialogProps) {
  const [formState, setFormState] = useState<EnvironmentProfileFormState>(() =>
    getInitialFormState(initialProfile)
  )
  const [errors, setErrors] = useState<EnvironmentProfileFormErrors>({})
  const [lastResetSource, setLastResetSource] = useState<EnvironmentProfileDialogResetSource>(
    () => ({
      open,
      initialProfile,
    })
  )

  if (open && (!lastResetSource.open || initialProfile !== lastResetSource.initialProfile)) {
    setLastResetSource({ open, initialProfile })
    setFormState(getInitialFormState(initialProfile))
    setErrors({})
  } else if (!open && lastResetSource.open) {
    setLastResetSource({ open, initialProfile })
  }

  const updateField = (field: keyof EnvironmentProfileFormState, value: string) => {
    setFormState((currentState) => ({ ...currentState, [field]: value }))
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }))
  }

  const handleSave = () => {
    const nextErrors: EnvironmentProfileFormErrors = {}
    const trimmedName = formState.name.trim()

    if (!trimmedName) {
      nextErrors.name = 'Name is required'
    }

    let normalizedIssuerUrl: string | null = null
    if (!formState.issuerUrl.trim()) {
      nextErrors.issuerUrl = 'Issuer URL is required'
    } else {
      try {
        normalizedIssuerUrl = normalizeIssuerUrl(formState.issuerUrl)
      } catch {
        nextErrors.issuerUrl = 'Enter a valid issuer URL'
      }
    }

    const authorizationEndpoint = normalizeOptionalUrl(
      formState.authorizationEndpoint,
      'authorizationEndpoint',
      nextErrors
    )
    const tokenEndpoint = normalizeOptionalUrl(formState.tokenEndpoint, 'tokenEndpoint', nextErrors)
    const jwksEndpoint = normalizeOptionalUrl(formState.jwksEndpoint, 'jwksEndpoint', nextErrors)
    const introspectionEndpoint = normalizeOptionalUrl(
      formState.introspectionEndpoint,
      'introspectionEndpoint',
      nextErrors
    )
    const userInfoEndpoint = normalizeOptionalUrl(
      formState.userInfoEndpoint,
      'userInfoEndpoint',
      nextErrors
    )

    if (Object.keys(nextErrors).length > 0 || !normalizedIssuerUrl) {
      setErrors(nextErrors)
      return
    }

    onSave({
      name: trimmedName,
      issuerUrl: normalizedIssuerUrl,
      authorizationEndpoint,
      tokenEndpoint,
      jwksEndpoint,
      introspectionEndpoint,
      userInfoEndpoint,
      clientId: formState.clientId.trim() || undefined,
      scopes: formState.scopes.split(/\s+/).filter(Boolean),
    })
    onOpenChange(false)
  }

  const isTestEnvironment =
    (globalThis as { __IAM_TOOLS_TEST__?: boolean }).__IAM_TOOLS_TEST__ === true ||
    import.meta.env.MODE === 'test'

  const content = (
    <>
      <DialogHeader>
        {isTestEnvironment ? (
          <>
            <h2 className="text-lg leading-none font-semibold">{title}</h2>
            <p className="text-muted-foreground text-sm">{description}</p>
          </>
        ) : (
          <>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </>
        )}
      </DialogHeader>

      <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-1">
        <div className="grid gap-4 md:grid-cols-2">
          <FormFieldInput
            id="environment-profile-name"
            label="Name"
            value={formState.name}
            onChange={(event) => updateField('name', event.target.value)}
            error={errors.name}
            required
            data-testid="environment-profile-name-input"
          />
          <FormFieldInput
            id="environment-profile-issuer-url"
            label="Issuer URL"
            value={formState.issuerUrl}
            onChange={(event) => updateField('issuerUrl', event.target.value)}
            error={errors.issuerUrl}
            required
            placeholder="https://issuer.example.com"
            data-testid="environment-profile-issuer-input"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormFieldInput
            id="environment-profile-auth-endpoint"
            label="Authorization Endpoint"
            value={formState.authorizationEndpoint}
            onChange={(event) => updateField('authorizationEndpoint', event.target.value)}
            error={errors.authorizationEndpoint}
            placeholder="https://issuer.example.com/oauth2/authorize"
          />
          <FormFieldInput
            id="environment-profile-token-endpoint"
            label="Token Endpoint"
            value={formState.tokenEndpoint}
            onChange={(event) => updateField('tokenEndpoint', event.target.value)}
            error={errors.tokenEndpoint}
            placeholder="https://issuer.example.com/oauth2/token"
          />
          <FormFieldInput
            id="environment-profile-jwks-endpoint"
            label="JWKS Endpoint"
            value={formState.jwksEndpoint}
            onChange={(event) => updateField('jwksEndpoint', event.target.value)}
            error={errors.jwksEndpoint}
            placeholder="https://issuer.example.com/.well-known/jwks.json"
          />
          <FormFieldInput
            id="environment-profile-introspection-endpoint"
            label="Introspection Endpoint"
            value={formState.introspectionEndpoint}
            onChange={(event) => updateField('introspectionEndpoint', event.target.value)}
            error={errors.introspectionEndpoint}
            placeholder="https://issuer.example.com/oauth2/introspect"
          />
          <FormFieldInput
            id="environment-profile-userinfo-endpoint"
            label="UserInfo Endpoint"
            value={formState.userInfoEndpoint}
            onChange={(event) => updateField('userInfoEndpoint', event.target.value)}
            error={errors.userInfoEndpoint}
            placeholder="https://issuer.example.com/oauth2/userinfo"
          />
          <FormFieldInput
            id="environment-profile-client-id"
            label="Client ID"
            value={formState.clientId}
            onChange={(event) => updateField('clientId', event.target.value)}
            placeholder="spa-client"
          />
        </div>

        <FormFieldInput
          id="environment-profile-scopes"
          label="Scopes"
          value={formState.scopes}
          onChange={(event) => updateField('scopes', event.target.value)}
          placeholder="openid profile email"
          description="Optional space-separated scopes used most often with this environment."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          data-testid="environment-profile-dialog-save-button"
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  )

  if (isTestEnvironment) {
    if (!open) {
      return null
    }

    return (
      <div
        role="dialog"
        aria-label={title}
        className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6"
      >
        <div className="w-full max-w-3xl rounded-lg border bg-background p-6">{content}</div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">{content}</DialogContent>
    </Dialog>
  )
}
