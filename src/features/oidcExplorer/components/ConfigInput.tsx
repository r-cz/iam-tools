import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { ShuffleIcon } from 'lucide-react'
import { IssuerHistory } from '@/components/common'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
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
    <Field orientation="responsive" className="gap-3">
      <div className="flex items-center gap-2">
        <FieldLabel htmlFor="issuer-url" className="flex items-center gap-2">
          OpenID Provider URL
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
                This is the base URL of the identity provider that implements OpenID Connect. We append
                <code className="bg-muted px-1">/.well-known/openid-configuration</code> to fetch the
                discovery document.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Use the <ShuffleIcon className="inline h-3 w-3 align-text-bottom" /> button to load a
                real-world example instantly.
              </p>
            </PopoverContent>
          </Popover>
        </FieldLabel>
      </div>

      <div className="space-y-3">
        <InputGroup>
          <InputGroupInput
            id="issuer-url"
            type="text"
            value={issuerUrl}
            onChange={(e) => setIssuerUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com/.well-known"
            aria-describedby="issuer-url-helper"
          />
          <InputGroupAddon className="gap-1">
            <IssuerHistory
              onSelectIssuer={(url) => {
                setIssuerUrl(url)
                onFetchRequested(url)
              }}
              compact
              configLoading={isLoading}
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={handleRandomExample}
              className="h-8 w-8"
              title="Load random example"
            >
              <ShuffleIcon className="h-4 w-4" />
              <span className="sr-only">Random issuer</span>
            </Button>
          </InputGroupAddon>
        </InputGroup>

        <FieldDescription id="issuer-url-helper" className="text-xs text-muted-foreground">
          Enter the issuer base URL. Use the fetch button to load discovery metadata.
        </FieldDescription>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start">
          <Button
            onClick={handleFetchConfig}
            disabled={isLoading || !issuerUrl}
            className="sm:w-auto"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" thickness="thin" aria-hidden="true" />
                Fetching configuration...
              </span>
            ) : (
              'Fetch Config'
            )}
          </Button>
        </div>
      </div>
    </Field>
  )
}
