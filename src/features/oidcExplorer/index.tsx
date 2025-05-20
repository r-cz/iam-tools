import { useEffect, useRef } from "react";
import { useOidcConfig } from "@/hooks/data-fetching/useOidcConfig";
import { useJwks } from "@/hooks/data-fetching/useJwks";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { 
  ConfigInput, 
  ConfigDisplay, 
  JwksDisplay, 
  ProviderInfo
} from "./components";
import { IssuerHistory } from "@/components/common";
import { detectProvider } from "./utils/config-helpers";
import { useIssuerHistory, useOidcExplorer } from "../../lib/state";
import { useSelectiveState } from "@/hooks"; // Import the selective state hook

export function OidcExplorer() {
  // Instantiate hooks
  const oidcConfigHook = useOidcConfig();
  const jwksHook = useJwks();
  const { addIssuer } = useIssuerHistory();
  const { 
    lastIssuerUrl, 
    recentJwks, 
    displayPreferences, 
    setLastIssuerUrl, 
    updateRecentJwks, 
    updateDisplayPreferences 
  } = useOidcExplorer();

  // Use selective state for local state persistence between page navigations
  const [explorerState, setExplorerState] = useSelectiveState({
    key: 'oidc-explorer-page-state',
    initialValue: {
      providerName: null as string | null,
      detectionReasons: [] as string[],
      currentIssuerUrl: '',
      inputIssuerUrl: lastIssuerUrl || '',
      lastFetchedJwksUri: null as string | null,
      activeTab: "config"
    },
    // We should exclude any state that shouldn't persist across sessions
    excludeKeys: []
  });

  // Destructure state and create setter functions for cleaner code
  const {
    providerName,
    detectionReasons,
    currentIssuerUrl,
    inputIssuerUrl,
    lastFetchedJwksUri,
    activeTab
  } = explorerState;

  // Create setter functions
  const setProviderName = (value: string | null) => 
    setExplorerState(prev => ({ ...prev, providerName: value }));
  
  const setDetectionReasons = (value: string[]) => 
    setExplorerState(prev => ({ ...prev, detectionReasons: value }));
  
  const setCurrentIssuerUrl = (value: string) => 
    setExplorerState(prev => ({ ...prev, currentIssuerUrl: value }));
  
  const setInputIssuerUrl = (value: string) => 
    setExplorerState(prev => ({ ...prev, inputIssuerUrl: value }));
  
  const setLastFetchedJwksUri = (value: string | null) => 
    setExplorerState(prev => ({ ...prev, lastFetchedJwksUri: value }));
  
  const setActiveTab = (value: string) => 
    setExplorerState(prev => ({ ...prev, activeTab: value }));
  
  // Use a ref to track if we've already added this URL to history
  const processedUrls = useRef<Set<string>>(new Set());

  // Effect to load last issuer URL from global state
  useEffect(() => {
    if (lastIssuerUrl && !currentIssuerUrl) {
      console.log('Using last issuer URL from global state:', lastIssuerUrl);
      setInputIssuerUrl(lastIssuerUrl);
      // Automatically fetch config for the last issuer URL
      oidcConfigHook.fetchConfig(lastIssuerUrl);
    }
  }, [lastIssuerUrl, currentIssuerUrl, setInputIssuerUrl, oidcConfigHook]);
  
  // Effect for successful OIDC config fetch
  useEffect(() => {
    if (oidcConfigHook.data) {
      const config = oidcConfigHook.data;
      console.log('OIDC Config loaded via hook:', config);
      setCurrentIssuerUrl(config.issuer); // Store the issuer from the fetched config
      
      // Only add to history if we haven't processed this URL yet
      if (inputIssuerUrl && 
          inputIssuerUrl.trim().length > 0 && 
          !processedUrls.current.has(inputIssuerUrl)) {
        // Mark as processed to prevent re-adding
        processedUrls.current.add(inputIssuerUrl);
        addIssuer(inputIssuerUrl);
        // Store in global state
        setLastIssuerUrl(inputIssuerUrl);
      }

      // Detect provider and reasons
      const { name: detectedProvider, reasons } = detectProvider(config.issuer, config);
      setProviderName(detectedProvider);
      setDetectionReasons(reasons);

      // Check if we already have cached JWKS for this issuer
      const cachedJwks = config.issuer ? recentJwks[config.issuer] : null;
      if (cachedJwks && cachedJwks.keys && cachedJwks.keys.length > 0) {
        console.log(`Using cached JWKS for issuer: ${config.issuer}`);
        // Use the cached JWKS (simulating a fetch)
        jwksHook.setData({ keys: cachedJwks.keys });
      } 
      // Otherwise, automatically trigger JWKS fetch if URI exists and hasn't been fetched already
      else if (config.jwks_uri && config.jwks_uri !== lastFetchedJwksUri) {
        console.log(`OIDC config has jwks_uri, fetching JWKS from: ${config.jwks_uri}`);
        setLastFetchedJwksUri(config.jwks_uri);
        jwksHook.fetchJwks(config.jwks_uri);
      } else if (!config.jwks_uri) {
        console.log('OIDC config does not have jwks_uri.');
      } else {
        console.log(`JWKS already fetched for URI: ${config.jwks_uri}`);
      }
    }
  }, [
    oidcConfigHook.data, 
    addIssuer, 
    setLastIssuerUrl, 
    recentJwks, 
    inputIssuerUrl, 
    lastFetchedJwksUri, 
    setProviderName, 
    setDetectionReasons, 
    setCurrentIssuerUrl, 
    setLastFetchedJwksUri,
    jwksHook
  ]); 

  // Effect for successful JWKS fetch
  useEffect(() => {
    if (jwksHook.data && oidcConfigHook.data) {
      console.log('JWKS loaded via hook:', jwksHook.data);
      
      // Cache the JWKS in global state
      if (oidcConfigHook.data.issuer && jwksHook.data?.keys) {
        updateRecentJwks(oidcConfigHook.data.issuer, jwksHook.data.keys);
      }
      
      toast.success('Successfully fetched JWKS', {
        description: `Found ${jwksHook.data?.keys?.length || 0} keys`,
        duration: 5000,
      });
    }
  }, [jwksHook.data, oidcConfigHook.data, updateRecentJwks]);

  // Effect for handling errors from either hook
  useEffect(() => {
    const error = oidcConfigHook.error || jwksHook.error;
    if (error) {
      console.error('Error fetching OIDC config or JWKS:', error);
      toast.error('Failed to fetch data', {
        description: error.message,
        duration: 8000,
      });
      // Reset provider name on error
      setProviderName(null);
    }
  }, [oidcConfigHook.error, jwksHook.error, setProviderName]);

  // Handle fetch request from ConfigInput or IssuerHistory
  const handleFetchConfig = (issuerUrl: string) => {
    setInputIssuerUrl(issuerUrl); // Store the URL that was input
    oidcConfigHook.fetchConfig(issuerUrl);
  };

  // Handle tab change and save preference
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Could potentially save tab preference to global state here if needed
  };

  // Combine loading states
  const isLoading = oidcConfigHook.isLoading || jwksHook.isLoading;
  // Combine error states
  const error = oidcConfigHook.error || jwksHook.error;

  // Handle display preference changes
  const handleDisplayPreferenceChange = (showOptionalFields: boolean, groupByCategory: boolean) => {
    updateDisplayPreferences({
      showOptionalFields,
      groupByCategory
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration Input */}
      <Card>
        <CardContent className="p-5">
          <div className="space-y-4">
            {/* Issuer History Component */}
            <IssuerHistory onSelectIssuer={handleFetchConfig} />
            
            {/* Config Input Component */}
            <ConfigInput
              onFetchRequested={handleFetchConfig}
              isLoading={isLoading}
              initialIssuerUrl={lastIssuerUrl}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8 rounded-lg border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {oidcConfigHook.isLoading ? 'Fetching configuration...' : 'Fetching JWKS...'}
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Display the configuration and JWKS using Tabs */}
      {!isLoading && oidcConfigHook.data && (
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            {oidcConfigHook.data.jwks_uri && (
              <TabsTrigger value="jwks" disabled={!jwksHook.data}>
                JWKS
              </TabsTrigger>
            )}
          </TabsList>

          {/* Configuration Tab Content */}
          <TabsContent value="config" className="mt-4 space-y-6">
            <ConfigDisplay 
              config={oidcConfigHook.data} 
              displayPreferences={displayPreferences}
              onDisplayPreferencesChange={handleDisplayPreferenceChange}
            />
            {providerName && (
              <ProviderInfo
                providerName={providerName}
                issuerUrl={currentIssuerUrl}
                reasons={detectionReasons}
              />
            )}
          </TabsContent>

          {/* JWKS Tab Content */}
          {oidcConfigHook.data.jwks_uri && (
            <TabsContent value="jwks" className="mt-4">
              {jwksHook.data ? (
                <JwksDisplay
                  jwks={jwksHook.data}
                  jwksUri={oidcConfigHook.data.jwks_uri || ''}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {jwksHook.isLoading ? 'Loading JWKS...' : 'JWKS data not yet available.'}
                </div>
              )}
            </TabsContent>
          )}

        </Tabs>
      )}
    </div>
  );
}