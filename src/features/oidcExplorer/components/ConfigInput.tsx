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

interface ConfigInputProps {
  onFetchRequested: (issuerUrl: string) => void // Renamed prop
  isLoading: boolean // Added back isLoading prop
}

export function ConfigInput({ onFetchRequested, isLoading }: ConfigInputProps) {
  const [issuerUrl, setIssuerUrl] = useState('')
  // Removed hook instantiation

  // Removed useEffect hooks

  const handleFetchConfig = () => {
    if (!issuerUrl) return
    onFetchRequested(issuerUrl)
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
    setIssuerUrl(selectedIssuer.url)
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

  return (
    <Field orientation="vertical" className="gap-3">
      <InputGroup className="flex-wrap">
        <InputGroupAddon
          align="block-start"
          className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span>OpenID Provider URL</span>
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
              onSelectIssuer={(url) => {
                setIssuerUrl(url)
                onFetchRequested(url)
              }}
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
        <InputGroupInput
          id="issuer-url"
          type="text"
          value={issuerUrl}
          onChange={(e) => setIssuerUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com/.well-known"
        />

        <InputGroupAddon
          align="block-end"
          className="flex w-full justify-end bg-transparent text-foreground"
        >
          <Button
            onClick={handleFetchConfig}
            disabled={isLoading || !issuerUrl}
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
