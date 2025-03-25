import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { fetchOidcConfig } from '../utils/config-helpers';
import { OidcConfiguration } from '../utils/types';

interface ConfigInputProps {
  onConfigFetched: (config: OidcConfiguration) => void;
  onError: (error: Error) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function ConfigInput({ onConfigFetched, onError, isLoading, setIsLoading }: ConfigInputProps) {
  const [issuerUrl, setIssuerUrl] = useState('');

  const handleFetchConfig = async () => {
    if (!issuerUrl) return;
    
    setIsLoading(true);
    try {
      const config = await fetchOidcConfig(issuerUrl);
      onConfigFetched(config);
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFetchConfig();
    }
  };

  const exampleIssuers = [
    { name: 'Auth0', url: 'https://example.auth0.com' },
    { name: 'Okta', url: 'https://example.okta.com' },
    { name: 'Azure AD', url: 'https://login.microsoftonline.com/common' },
    { name: 'Google', url: 'https://accounts.google.com' },
    { name: 'AWS Cognito', url: 'https://cognito-idp.region.amazonaws.com/userPoolId' },
  ];

  const handleExampleClick = (url: string) => {
    setIssuerUrl(url);
  };

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
                  This is the base URL of the identity provider that implements OpenID Connect. The app will append 
                  <code className="bg-muted px-1">.well-known/openid-configuration</code> to fetch configuration info.
                </p>
                <p className="mt-2 text-xs">Examples:</p>
                <ul className="text-xs mt-1 space-y-1">
                  {exampleIssuers.map((issuer, index) => (
                    <li key={index}>
                      <button
                        className="bg-muted px-1 hover:bg-muted/80 text-left w-full"
                        onClick={() => handleExampleClick(issuer.url)}
                      >
                        {issuer.name}: {issuer.url}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex gap-2">
          <Input
            id="issuer-url"
            type="text"
            value={issuerUrl}
            onChange={(e) => setIssuerUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com/identity"
            className="flex-1"
          />
          <Button 
            onClick={handleFetchConfig} 
            disabled={isLoading || !issuerUrl}
          >
            {isLoading ? 'Fetching...' : 'Fetch Config'}
          </Button>
        </div>
      </div>
    </div>
  );
}
