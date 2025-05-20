import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { OAuthConfig, PkceParams, TokenResponse } from '../utils/types';
import ConfigurationForm from './ConfigurationForm';
import AuthorizationRequest from './AuthorizationRequest';
import TokenExchange from './TokenExchange';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useOAuthPlayground } from '@/lib/state';

export function AuthCodeWithPkceFlow() {
  const location = useLocation();
  
  // Get state from global state
  const { 
    activeConfig, 
    lastDemoMode, 
    addConfig 
  } = useOAuthPlayground();
  
  // Local component state
  const [activeTab, setActiveTab] = useState<string>('config');
  const [config, setConfig] = useState<OAuthConfig | null>(null);
  const [pkce, setPkce] = useState<PkceParams | null>(null);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);
  
  // Flag to track if initial load is complete
  const initialLoadComplete = useRef(false);
  
  // Initialize from location state (returning from callback) or stored state
  useEffect(() => {
    // Only run this effect once
    if (initialLoadComplete.current) return;
    
    // Check if we have a code from the location state
    if (location.state?.code) {
      setAuthCode(location.state.code);
      
      // Load saved config and PKCE from localStorage
      const savedConfig = localStorage.getItem('oauth_playground_config');
      const savedPkce = localStorage.getItem('oauth_playground_pkce');
      
      if (savedConfig && savedPkce) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        setPkce(JSON.parse(savedPkce));
        setActiveTab('token');
        
        // Ensure the config is saved in global state
        if (parsedConfig) {
          addConfig({
            clientId: parsedConfig.clientId,
            redirectUri: parsedConfig.redirectUri,
            scopes: parsedConfig.scopes,
            issuerUrl: parsedConfig.issuerUrl,
            flowType: 'authorization_code_pkce',
            demoMode: !!parsedConfig.demoMode,
            name: parsedConfig.demoMode 
              ? 'Demo Config' 
              : `${parsedConfig.clientId} @ ${parsedConfig.issuerUrl || 'Unknown Issuer'}`
          });
        }
      }
    } else if (activeConfig) {
      // Load from active config in global state
      setConfig({
        issuerUrl: activeConfig.issuerUrl,
        clientId: activeConfig.clientId,
        redirectUri: activeConfig.redirectUri,
        scopes: activeConfig.scopes,
        demoMode: activeConfig.demoMode,
        // Need to load these from localStorage or they'll be undefined
        authEndpoint: undefined,
        tokenEndpoint: undefined,
        jwksEndpoint: undefined
      });
      
      // Try to load endpoints from localStorage if we have an active config
      try {
        const savedConfig = localStorage.getItem('oauth_playground_config');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          
          // Only use the endpoints from localStorage, keep the rest from global state
          setConfig(current => {
            if (!current) return null;
            return {
              ...current,
              authEndpoint: parsedConfig.authEndpoint,
              tokenEndpoint: parsedConfig.tokenEndpoint,
              jwksEndpoint: parsedConfig.jwksEndpoint,
            };
          });
        }
        
        // If we have PKCE params saved, load them
        const savedPkce = localStorage.getItem('oauth_playground_pkce');
        if (savedPkce) {
          setPkce(JSON.parse(savedPkce));
        }
        
        // If we have an auth code saved, load it
        const savedAuthCode = localStorage.getItem('oauth_playground_auth_code');
        if (savedAuthCode) {
          setAuthCode(savedAuthCode);
          setActiveTab('token');
        }
        
        // If we have a token response saved, load it
        const savedTokenResponse = localStorage.getItem('oauth_playground_token_response');
        if (savedTokenResponse) {
          setTokenResponse(JSON.parse(savedTokenResponse));
        }
      } catch (error) {
        console.error('Error loading saved state from localStorage:', error);
      }
    }
    
    // Mark initial load as complete
    initialLoadComplete.current = true;
  }, [location.state, activeConfig, addConfig]);
  
  // Save config to localStorage whenever it changes
  useEffect(() => {
    if (config) {
      localStorage.setItem('oauth_playground_config', JSON.stringify(config));
    }
  }, [config]);
  
  // Save PKCE to localStorage whenever it changes
  useEffect(() => {
    if (pkce) {
      localStorage.setItem('oauth_playground_pkce', JSON.stringify(pkce));
    }
  }, [pkce]);
  
  // Save auth code to localStorage whenever it changes
  useEffect(() => {
    if (authCode) {
      localStorage.setItem('oauth_playground_auth_code', authCode);
    }
  }, [authCode]);
  
  // Save token response to localStorage whenever it changes
  useEffect(() => {
    if (tokenResponse) {
      localStorage.setItem('oauth_playground_token_response', JSON.stringify(tokenResponse));
    }
  }, [tokenResponse]);
  
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