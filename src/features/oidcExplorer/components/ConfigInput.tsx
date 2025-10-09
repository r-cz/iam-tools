import React, { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { ShuffleIcon, Globe } from 'lucide-react'
import { IssuerHistory } from '@/components/common'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Label } from '@/components/ui/label'

interface ConfigInputProps {
  onFetchRequested: (issuerUrl: string) => void // Renamed prop
  isLoading: boolean // Added back isLoading prop
}

export function ConfigInput({ onFetchRequested, isLoading }: ConfigInputProps) {
  const [issuerUrl, setIssuerUrl] = useState('')
  const [scheme, setScheme] = useState<'https://' | 'http://'>('https://')
  // Removed hook instantiation

  // Removed useEffect hooks

  const stripScheme = (value: string) => value.replace(/^https?:\/\//i, '')

  const deriveScheme = (value: string): 'https://' | 'http://' =>
    value.toLowerCase().startsWith('http://') ? 'http://' : 'https://'

  const updateIssuerValue = (value: string) => {
    const trimmed = value.trim()

    if (!trimmed) {
      setIssuerUrl('')
      setScheme('https://')
      return
    }

    if (/^https?:\/\//i.test(trimmed)) {
      const nextScheme = deriveScheme(trimmed)
      setScheme(nextScheme)
      setIssuerUrl(stripScheme(trimmed))
      return
    }

    setIssuerUrl(trimmed)
  }

  const handleFetchConfig = () => {
    const trimmed = issuerUrl.trim()
    if (!trimmed) return

    const fullUrl = `${scheme}${trimmed}`
    onFetchRequested(fullUrl)
  }

  // Define handleKeyDown correctly
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFetchConfig()
    }
  }

  // Removed exampleIssuers array

  // Real-world public issuers for the random button
  const realWorldIssuers = [
    // Original examples
    { name: 'Chick-fil-A', url: 'https://login.my.chick-fil-a.com' },
    { name: 'Southwest', url: 'https://secure.southwest.com' },
    { name: 'FedEx', url: 'https://auth.fedex.com' },
    { name: 'Delta Airlines', url: 'https://signin.delta.com' },

    // Popular identity providers
    { name: 'Google', url: 'https://accounts.google.com' },
    { name: 'Microsoft', url: 'https://login.microsoftonline.com/common' },
    { name: 'GitHub', url: 'https://token.actions.githubusercontent.com' },
    { name: 'Auth0 Demo', url: 'https://samples.auth0.com' },
    { name: 'Salesforce', url: 'https://login.salesforce.com' },
    { name: 'Spotify', url: 'https://accounts.spotify.com' },
    { name: 'Discord', url: 'https://discord.com' },
    { name: 'Apple', url: 'https://appleid.apple.com' },
  ]

  // Removed handleExampleClick function

  const handleRandomExample = () => {
    const randomIndex = Math.floor(Math.random() * realWorldIssuers.length)
    const selectedIssuer = realWorldIssuers[randomIndex]
    const nextScheme = deriveScheme(selectedIssuer.url)
    setScheme(nextScheme)
    setIssuerUrl(stripScheme(selectedIssuer.url))
    toast.info(
      <div>
        <p>
          <strong>Random Issuer Selected</strong>
        </p>
        <p>
          {selectedIssuer.name}: {selectedIssuer.url}
        </p>
      </div>,
      {
        duration: 3000,
      }
    )
  }

  const handleSelectIssuerFromHistory = (url: string) => {
    const nextScheme = deriveScheme(url)
    setScheme(nextScheme)
    setIssuerUrl(stripScheme(url))
    onFetchRequested(url)
  }

  return (
    <Field orientation="vertical" className="gap-3">
      <InputGroup className="flex-wrap">
        <InputGroupAddon
          align="block-start"
          className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent border-0 pb-1"
        >
          <div className="flex items-center gap-2">
            <Label htmlFor="issuer-url" className="text-sm font-medium text-foreground">
              OpenID Provider URL
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <span
                  className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                  aria-label="Issuer URL info"
                >
                  ?
                </span>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 text-sm">
                <p className="font-medium">What is an OpenID Provider URL?</p>
                <p className="mt-1 text-muted-foreground">
                  Enter the base URL of your OpenID Connect provider. The discovery document will be
                  fetched automatically when requested.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <IssuerHistory
              onSelectIssuer={handleSelectIssuerFromHistory}
              compact
              configLoading={isLoading}
              label="Recents"
              buttonVariant="input-group"
            />
            <InputGroupButton
              type="button"
              size="sm"
              variant="outline"
              grouped={false}
              className="flex items-center gap-1.5"
              onClick={handleRandomExample}
              title="Load random example"
              aria-label="Load random example"
            >
              <ShuffleIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Random</span>
            </InputGroupButton>
          </div>
        </InputGroupAddon>
        <div
          data-slot="input-group-control"
          className="w-full px-3 pb-3 pt-0"
        >
          <div className="relative flex w-full items-center">
            <span className="pointer-events-none absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-l-md border border-border/60 bg-muted/70 px-3 py-2 text-sm font-medium text-muted-foreground">
              {scheme}
            </span>
            <InputGroupInput
              id="issuer-url"
              type="url"
              value={issuerUrl}
              onChange={(e) => updateIssuerValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="issuer.example.com"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="url"
              aria-autocomplete="none"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
              name="issuer"
              className="h-11 rounded-none border-0 bg-transparent pl-[5.5rem] pr-4 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        <InputGroupAddon
          align="block-end"
          className="flex w-full justify-end bg-transparent text-foreground border-0"
        >
          <Button
            onClick={handleFetchConfig}
            disabled={isLoading || !issuerUrl.trim()}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" thickness="thin" aria-hidden="true" />
                <span>Fetching configuration...</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                <span>Fetch Config</span>
              </>
            )}
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
