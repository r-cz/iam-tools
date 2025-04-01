import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { OAuthConfig, PkceParams, TokenResponse } from '../utils/types';
import ConfigurationForm from './ConfigurationForm';
import AuthorizationRequest from './AuthorizationRequest';
import TokenExchange from './TokenExchange';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function AuthCodeWithPkceFlow() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('config');
  const [config, setConfig] = useState<OAuthConfig | null>(null);
  const [pkce, setPkce] = useState<PkceParams | null>(null);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);
  
  // Persistent storage for flow state
  const [storedState, setStoredState] = useLocalStorage<{
    config?: OAuthConfig;
    pkce?: PkceParams;
    authCode?: string;
    tokenResponse?: TokenResponse;
    activeTab?: string;
  }>('oauth_playground_state', {});
  
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
        setConfig(JSON.parse(savedConfig));
        setPkce(JSON.parse(savedPkce));
        setActiveTab('token');
      }
    } else {
      // Load from persistent storage if available
      if (storedState.config) setConfig(storedState.config);
      if (storedState.pkce) setPkce(storedState.pkce);
      if (storedState.authCode) setAuthCode(storedState.authCode);
      if (storedState.tokenResponse) setTokenResponse(storedState.tokenResponse);
      if (storedState.activeTab) setActiveTab(storedState.activeTab);
    }
    
    // Mark initial load as complete
    initialLoadComplete.current = true;
  // Only depend on location.state, not on storedState
  }, [location.state]);
  
  // Save state changes to storage
  // Using useEffect to batch updates and avoid saving on every render
  const saveToStorage = () => {
    // Only save if initial load is complete
    if (!initialLoadComplete.current) return;
    
    setStoredState({
      config: config || undefined,
      pkce: pkce || undefined,
      authCode: authCode || undefined,
      tokenResponse: tokenResponse || undefined,
      activeTab
    });
  };
  
  // Save state changes when component unmounts
  useEffect(() => {
    return () => {
      saveToStorage();
    };
  }, []);
  
  // Handle configuration completion
  const handleConfigComplete = (newConfig: OAuthConfig, newPkce: PkceParams) => {
    setConfig(newConfig);
    setPkce(newPkce);
    setActiveTab('auth');
    
    // Save to storage when advancing to next step
    setTimeout(saveToStorage, 0);
  };
  
  // Handle authorization completion
  const handleAuthorizationComplete = (code: string) => {
    setAuthCode(code);
    setActiveTab('token');
    
    // Save to storage when advancing to next step
    setTimeout(saveToStorage, 0);
  };
  
  // Handle token exchange completion
  const handleTokenExchangeComplete = (response: TokenResponse) => {
    setTokenResponse(response);
    
    // Save to storage when advancing to next step
    setTimeout(saveToStorage, 0);
  };
  
  // Determine which tabs should be enabled
  const isAuthTabEnabled = !!config && !!pkce;
  const isTokenTabEnabled = isAuthTabEnabled && !!authCode;
  
  // Save state when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Save to storage when changing tabs
    setTimeout(saveToStorage, 0);
  };
  
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardContent className="p-5">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-3 w-full mb-4">
              <TabsTrigger value="config">
                1. Configuration
              </TabsTrigger>
              <TabsTrigger value="auth" disabled={!isAuthTabEnabled}>
                2. Authorization
              </TabsTrigger>
              <TabsTrigger value="token" disabled={!isTokenTabEnabled}>
                3. Token Exchange
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="config">
              <ConfigurationForm onConfigComplete={handleConfigComplete} />
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
