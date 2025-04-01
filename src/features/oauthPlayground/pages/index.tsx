import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { OAuthConfig, OAuthFlowType, PkceParams, TokenResponse } from '../utils/types';
import FlowSelector from '../components/FlowSelector';
import ConfigurationForm from '../components/ConfigurationForm';
import AuthorizationRequest from '../components/AuthorizationRequest';
import TokenExchange from '../components/TokenExchange';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function OAuthPlaygroundPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('flow');
  const [selectedFlow, setSelectedFlow] = useState<OAuthFlowType>(OAuthFlowType.AUTH_CODE_PKCE);
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
  
  // Handle flow selection
  const handleFlowSelect = (flow: OAuthFlowType) => {
    setSelectedFlow(flow);
    // Reset state when changing flows
    setConfig(null);
    setPkce(null);
    setAuthCode(null);
    setTokenResponse(null);
  };
  
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
    setActiveTab('complete');
    
    // Save to storage when advancing to next step
    setTimeout(saveToStorage, 0);
  };
  
  // Determine which tabs should be enabled
  const isConfigTabEnabled = true;
  const isAuthTabEnabled = !!config && !!pkce;
  const isTokenTabEnabled = isAuthTabEnabled && !!authCode;
  
  // Save state when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Save to storage when changing tabs
    setTimeout(saveToStorage, 0);
  };
  
  return (
    <div className="container py-6 space-y-6 max-w-5xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">OAuth Playground</h1>
        <p className="text-muted-foreground">
          Test and explore OAuth 2.0 flows interactively
        </p>
      </div>
      
      <Separator />
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="flow" disabled={false}>
            1. Select Flow
          </TabsTrigger>
          <TabsTrigger value="config" disabled={!isConfigTabEnabled}>
            2. Configuration
          </TabsTrigger>
          <TabsTrigger value="auth" disabled={!isAuthTabEnabled}>
            3. Authorization
          </TabsTrigger>
          <TabsTrigger value="token" disabled={!isTokenTabEnabled}>
            4. Token Exchange
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="flow" className="py-4 space-y-4">
          <FlowSelector
            selectedFlow={selectedFlow}
            onSelectFlow={handleFlowSelect}
          />
          
          {selectedFlow && (
            <div className="flex justify-end">
              <button
                className="text-primary font-medium"
                onClick={() => handleTabChange('config')}
              >
                Next: Configuration →
              </button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="config" className="py-4">
          <ConfigurationForm onConfigComplete={handleConfigComplete} />
        </TabsContent>
        
        <TabsContent value="auth" className="py-4">
          {config && pkce && (
            <AuthorizationRequest
              config={config}
              pkce={pkce}
              onAuthorizationComplete={handleAuthorizationComplete}
            />
          )}
        </TabsContent>
        
        <TabsContent value="token" className="py-4">
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
    </div>
  );
}

export default OAuthPlaygroundPage;
