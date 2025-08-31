import React, { useState } from 'react' // Removed useEffect
// Removed hook import: import { useOidcConfig } from '@/hooks/data-fetching/useOidcConfig';
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShuffleIcon } from 'lucide-react'
import { IssuerHistory } from '@/components/common'
// No OIDC types needed here anymore
// import { OidcConfiguration } from '../utils/types';

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
    console.log(`Requesting fetch for: ${issuerUrl}`)
    onFetchRequested(issuerUrl) // Call the prop function
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
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor="issuer-url" className="block text-sm font-medium">
            OpenID Provider URL
          </label>
          <Popover>
            <PopoverTrigger>
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-medium cursor-help"
                aria-label="Issuer URL info"
              >
                ?
              </span>
            </PopoverTrigger>
            <PopoverContent>
              <div className="max-w-xs">
                <p className="font-medium">What is an OpenID Provider URL?</p>
                <p className="mt-1">
                  This is the base URL of the identity provider that implements OpenID Connect. The
                  app will append
                  <code className="bg-muted px-1">.well-known/openid-configuration</code> to fetch
                  configuration info.
                </p>
                <p className="mt-2 text-xs">
                  Click the <ShuffleIcon className="inline h-3 w-3 align-text-bottom" /> button next
                  to the input field to load a real-world example.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Input
              id="issuer-url"
              type="text"
              value={issuerUrl}
              onChange={(e) => setIssuerUrl(e.target.value)}
              onKeyDown={handleKeyDown} // Ensure this prop uses the correctly defined function
              placeholder="https://example.com/identity"
              className="pr-20"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
              <IssuerHistory
                onSelectIssuer={(url) => {
                  setIssuerUrl(url)
                  onFetchRequested(url)
                }}
                compact={true}
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
              </Button>
            </div>
          </div>
          <Button
            onClick={handleFetchConfig}
            disabled={isLoading || !issuerUrl} // Use prop isLoading state
            className="sm:w-auto w-full"
          >
            {isLoading ? 'Fetching...' : 'Fetch Config'}
          </Button>
        </div>
      </div>
    </div>
  )
}
