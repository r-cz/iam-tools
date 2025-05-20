import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { OAuthConfig, PkceParams, TokenResponse } from '../utils/types';
import ConfigurationForm from './ConfigurationForm';
import AuthorizationRequest from './AuthorizationRequest';
import TokenExchange from './TokenExchange';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useOAuthPlayground } from '@/lib/state';
import { useSelectiveState } from '@/hooks';

export function AuthCodeWithPkceFlow() {
  const location = useLocation();
  
  // Get state from global state
  const { 
    activeConfig, 
    lastDemoMode, 
    addConfig 
  } = useOAuthPlayground();
  
  // Use selective state for persistent state between page navigations
  const [oauthState, setOauthState] = useSelectiveState({
    key: 'oauth-playground-state',
    initialValue: {
      activeTab: 'config',
      config: null as OAuthConfig | null,
      pkce: null as PkceParams | null,
      authCode: null as string | null,
      tokenResponse: null as TokenResponse | null
    },
    // We don't exclude any fields as all of them should persist
    excludeKeys: []
  });

  // Destructure state for easier access
  const { activeTab, config, pkce, authCode } = oauthState;
  // tokenResponse is used in the handleTokenExchangeComplete

  // Create setter functions
  const setActiveTab = (value: string) => 
    setOauthState(prev => ({ ...prev, activeTab: value }));
  
  const setConfig = (value: OAuthConfig | null) => 
    setOauthState(prev => ({ ...prev, config: value }));
  
  const setPkce = (value: PkceParams | null) => 
    setOauthState(prev => ({ ...prev, pkce: value }));
  
  const setAuthCode = (value: string | null) => 
    setOauthState(prev => ({ ...prev, authCode: value }));
  
  const setTokenResponse = (value: TokenResponse | null) => 
    setOauthState(prev => ({ ...prev, tokenResponse: value }));
  
  // Flag to track if initial load is complete
  const initialLoadComplete = useRef(false);
  
  // Initialize from location state (returning from callback)
  // Note: We don't need to load from localStorage as the selective state hook handles that
  useEffect(() => {
    // Only run this effect once
    if (initialLoadComplete.current) return;
    
    // Check if we have a code from the location state
    if (location.state?.code) {
      // If we have a code from the auth callback
      setAuthCode(location.state.code);
      setActiveTab('token');
      
      // If we have a config but no saved config in selective state
      if (!config && activeConfig) {
        const newConfig: OAuthConfig = {
          issuerUrl: activeConfig.issuerUrl,
          clientId: activeConfig.clientId,
          redirectUri: activeConfig.redirectUri,
          scopes: activeConfig.scopes,
          demoMode: activeConfig.demoMode,
          // Global state doesn't have endpoints, so set to undefined
          authEndpoint: undefined,
          tokenEndpoint: undefined,
          jwksEndpoint: undefined
        };
        
        setConfig(newConfig);
        
        // Ensure the config is saved in global state
        addConfig({
          clientId: newConfig.clientId,
          redirectUri: newConfig.redirectUri,
          scopes: newConfig.scopes || [],
          issuerUrl: newConfig.issuerUrl,
          flowType: 'authorization_code_pkce',
          demoMode: !!newConfig.demoMode,
          name: newConfig.demoMode 
            ? 'Demo Config' 
            : `${newConfig.clientId} @ ${newConfig.issuerUrl || 'Unknown Issuer'}`
        });
      }
    } 
    // If we have an active config but no config in our selective state
    else if (!config && activeConfig) {
      // Load from active config in global state
      setConfig({
        issuerUrl: activeConfig.issuerUrl,
        clientId: activeConfig.clientId,
        redirectUri: activeConfig.redirectUri,
        scopes: activeConfig.scopes,
        demoMode: activeConfig.demoMode,
        // Global state doesn't have endpoints, so set to undefined
        authEndpoint: undefined,
        tokenEndpoint: undefined,
        jwksEndpoint: undefined
      });
    }
    
    // Mark initial load as complete
    initialLoadComplete.current = true;
  }, [location.state, activeConfig, addConfig, config, setConfig, setAuthCode, setActiveTab]);
  
  // No need for separate effects to save to localStorage
  // The useSelectiveState hook handles that automatically
  
  // Handle configuration completion
  const handleConfigComplete = (newConfig: OAuthConfig, newPkce: PkceParams) => {
    setConfig(newConfig);
    setPkce(newPkce);
    setActiveTab('auth');
    
    // Save to global state
    addConfig({
      clientId: newConfig.clientId,
      redirectUri: newConfig.redirectUri,
      scopes: newConfig.scopes || [],
      issuerUrl: newConfig.issuerUrl,
      flowType: 'authorization_code_pkce',
      demoMode: !!newConfig.demoMode,
      name: newConfig.demoMode 
        ? 'Demo Config' 
        : `${newConfig.clientId} @ ${newConfig.issuerUrl || 'Unknown Issuer'}`
    });
  };
  
  // Handle authorization completion
  const handleAuthorizationComplete = (code: string) => {
    setAuthCode(code);
    setActiveTab('token');
  };
  
  // Handle token exchange completion
  const handleTokenExchangeComplete = (response: TokenResponse) => {
    setTokenResponse(response);
  };
  
  // Determine which tabs should be enabled
  const isAuthTabEnabled = !!config && !!pkce;
  const isTokenTabEnabled = isAuthTabEnabled && !!authCode;
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardContent className="p-5">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-3 w-full mb-4">
              <TabsTrigger value="config">
                1. Config
              </TabsTrigger>
              <TabsTrigger value="auth" disabled={!isAuthTabEnabled}>
                2. AuthZ
              </TabsTrigger>
              <TabsTrigger value="token" disabled={!isTokenTabEnabled}>
                3. Get Token
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="config">
              <ConfigurationForm 
                onConfigComplete={handleConfigComplete} 
                initialConfig={activeConfig}
                lastDemoMode={lastDemoMode}
              />
            </TabsContent>
            
            <TabsContent value="auth">
              {config && pkce && (
                <AuthorizationRequest
                  config={config}
                  pkce={pkce}
                  onAuthorizationComplete={handleAuthorizationComplete}
                />
              )}
            </TabsContent>
            
            <TabsContent value="token">
              {config && pkce && authCode && (
                <TokenExchange
                  config={config}
                  pkce={pkce}
                  authorizationCode={authCode}
                  onTokenExchangeComplete={handleTokenExchangeComplete}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}