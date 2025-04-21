// src/tests/features/oauthPlayground/integration/auth-code-pkce-flow.test.tsx
import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthCodeWithPkceFlow } from '../../../../features/oauthPlayground/components/AuthCodeWithPkceFlow';
import { TokenResponse } from '../../../../features/oauthPlayground/utils/types';
import * as pkceUtils from '../../../../features/oauthPlayground/utils/pkce';

// Mock the localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Mock the useLocalStorage hook to use our mockLocalStorage
mock.module('../../../../hooks/use-local-storage', () => ({
  useLocalStorage: (key: string, initialValue: any) => {
    const storedValue = mockLocalStorage.getItem(key);
    const [state, setState] = React.useState(storedValue ? JSON.parse(storedValue) : initialValue);
    
    const setValue = (value: any) => {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);
      mockLocalStorage.setItem(key, JSON.stringify(valueToStore));
    };
    
    return [state, setValue];
  }
}));

// Mock the proxyFetch module
mock.module('../../../../lib/proxy-fetch', () => ({
  proxyFetch: mock(async (url: string, options?: RequestInit) => {
    if (url.includes('token')) {
      // This is a token request
      const body = options?.body ? new URLSearchParams(options.body.toString()) : new URLSearchParams();
      const code = body.get('code');
      const codeVerifier = body.get('code_verifier');
      
      // Simulate token response
      if (code && codeVerifier) {
        return new Response(JSON.stringify({
          access_token: 'mock_access_token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'mock_refresh_token',
          id_token: 'mock_id_token',
          scope: 'openid profile email'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({
          error: 'invalid_request',
          error_description: 'Missing required parameters'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Default response
    return new Response(JSON.stringify({ message: 'Not implemented in test' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  })
}));

// Mock window.open for authorization popups
const originalWindowOpen = window.open;
const mockWindowOpen = mock(() => {
  // Return a mock window object
  return {
    location: { href: '' },
    closed: false,
    close: () => {}
  } as unknown as Window;
});

// Mock the signToken utility to use in demo mode
mock.module('../../../../lib/jwt/sign-token', () => ({
  signToken: async () => 'mock.signed.token'
}));

describe('OAuth Authorization Code with PKCE Flow Integration', () => {
  // Generate deterministic values for tests
  const mockCodeVerifier = 'test_code_verifier_with_sufficient_length_for_pkce';
  const mockCodeChallenge = 'test_code_challenge_derived_from_verifier';
  const mockState = 'test_state_for_csrf_protection';
  
  // Mock the pkce utilities for deterministic testing
  beforeEach(() => {
    // Replace global objects
    global.localStorage = mockLocalStorage as any;
    window.open = mockWindowOpen;
    
    // Mock PKCE utilities to return deterministic values
    mock.module('../../../../features/oauthPlayground/utils/pkce', () => ({
      generateCodeVerifier: () => mockCodeVerifier,
      generateCodeChallenge: async () => mockCodeChallenge,
      generateState: () => mockState,
      validateState: (received: string, expected: string) => received === expected,
      base64UrlEncode: (buffer: Uint8Array) => {
        // Simple mock for tests
        return Buffer.from(buffer).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      }
    }));
    
    // Clear localStorage before each test
    mockLocalStorage.clear();
  });
  
  // Restore originals after tests
  afterEach(() => {
    window.open = originalWindowOpen;
  });
  
  // Test the complete OAuth flow
  test('should complete the full OAuth flow with PKCE', async () => {
    // Render the component with router
    render(
      <MemoryRouter initialEntries={['/oauth-playground/auth-code-pkce']}>
        <Routes>
          <Route path="/oauth-playground/auth-code-pkce" element={<AuthCodeWithPkceFlow />} />
        </Routes>
      </MemoryRouter>
    );
    
    // 1. Configuration step
    // Verify initial state - Configuration form should be visible
    expect(screen.getByText('1. Config')).toBeInTheDocument();
    
    // Fill out the configuration form
    const clientIdInput = screen.getByLabelText(/Client ID/i);
    const redirectUriInput = screen.getByLabelText(/Redirect URI/i);
    const scopeInput = screen.getByLabelText(/Scopes/i);
    const demoModeSwitch = screen.getByRole('switch', { name: /Demo Mode/i });
    
    await userEvent.type(clientIdInput, 'test-client-id');
    await userEvent.type(redirectUriInput, 'http://localhost:3000/callback');
    await userEvent.type(scopeInput, 'openid profile email');
    await userEvent.click(demoModeSwitch); // Enable demo mode for testing
    
    // Submit the form
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await userEvent.click(nextButton);
    
    // 2. Authorization step
    // Verify Authorization Request form is now visible
    await waitFor(() => {
      expect(screen.getByText('Authorization Request')).toBeInTheDocument();
    });
    
    // Check if the authorization URL contains expected parameters
    const authUrlElement = screen.getByText(/^http/);
    const authUrlText = authUrlElement.textContent || '';
    expect(authUrlText).toContain('response_type=code');
    expect(authUrlText).toContain('client_id=test-client-id');
    expect(authUrlText).toContain(`code_challenge=${mockCodeChallenge}`);
    expect(authUrlText).toContain('code_challenge_method=S256');
    expect(authUrlText).toContain(`state=${mockState}`);
    
    // Launch authorization request
    const launchButton = screen.getByRole('button', { name: /Launch Authorization Request/i });
    await userEvent.click(launchButton);
    
    // Verify window.open was called with the authorization URL
    expect(mockWindowOpen).toHaveBeenCalled();
    
    // Simulate receiving authorization code through message event
    const authCode = 'test_authorization_code';
    const messageEvent = new MessageEvent('message', {
      data: {
        type: 'oauth_callback',
        code: authCode
      },
      origin: window.location.origin
    });
    window.dispatchEvent(messageEvent);
    
    // 3. Token exchange step
    // Verify Token Exchange form is now visible
    await waitFor(() => {
      expect(screen.getByText('Token Exchange')).toBeInTheDocument();
    });
    
    // Check if the authorization code is displayed
    expect(screen.getByText(authCode)).toBeInTheDocument();
    
    // Exchange code for tokens
    const exchangeButton = screen.getByRole('button', { name: /Exchange Code for Tokens/i });
    await userEvent.click(exchangeButton);
    
    // Verify token response is displayed
    await waitFor(() => {
      expect(screen.getByText('Access Token')).toBeInTheDocument();
      expect(screen.getByText('ID Token')).toBeInTheDocument();
    });
    
    // Check tokens are displayed and inspect buttons are available
    expect(screen.getByText('mock.signed.token')).toBeInTheDocument();
    
    const inspectAccessButton = screen.getByRole('button', { name: /Inspect Access Token/i });
    const inspectIdButton = screen.getByRole('button', { name: /Inspect ID Token/i });
    expect(inspectAccessButton).toBeInTheDocument();
    expect(inspectIdButton).toBeInTheDocument();
  });
  
  // Test error handling in authorization
  test('should handle authorization errors', async () => {
    // Render the component with router
    render(
      <MemoryRouter initialEntries={['/oauth-playground/auth-code-pkce']}>
        <Routes>
          <Route path="/oauth-playground/auth-code-pkce" element={<AuthCodeWithPkceFlow />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Complete configuration step
    const clientIdInput = screen.getByLabelText(/Client ID/i);
    const redirectUriInput = screen.getByLabelText(/Redirect URI/i);
    const demoModeSwitch = screen.getByRole('switch', { name: /Demo Mode/i });
    
    await userEvent.type(clientIdInput, 'test-client-id');
    await userEvent.type(redirectUriInput, 'http://localhost:3000/callback');
    await userEvent.click(demoModeSwitch);
    await userEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    // Go to authorization step
    await waitFor(() => {
      expect(screen.getByText('Authorization Request')).toBeInTheDocument();
    });
    
    // Launch authorization request
    await userEvent.click(screen.getByRole('button', { name: /Launch Authorization Request/i }));
    
    // Simulate receiving error from authorization server
    const errorEvent = new MessageEvent('message', {
      data: {
        type: 'oauth_callback',
        error: 'access_denied',
        error_description: 'User denied access'
      },
      origin: window.location.origin
    });
    window.dispatchEvent(errorEvent);
    
    // We should stay on the authorization step as it failed
    await waitFor(() => {
      expect(screen.getByText('Authorization Request')).toBeInTheDocument();
    });
  });
  
  // Test state restoration from localStorage
  test('should restore flow state from localStorage', async () => {
    // Setup localStorage with a saved state
    const savedConfig = {
      clientId: 'saved-client-id',
      redirectUri: 'http://localhost:3000/saved-callback',
      scopes: ['openid', 'profile'],
      demoMode: true
    };
    
    const savedPkce = {
      codeVerifier: mockCodeVerifier,
      codeChallenge: mockCodeChallenge,
      state: mockState
    };
    
    const authCode = 'saved_authorization_code';
    
    const savedState = {
      config: savedConfig,
      pkce: savedPkce,
      authCode: authCode,
      activeTab: 'token'
    };
    
    mockLocalStorage.setItem('oauth_playground_state', JSON.stringify(savedState));
    
    // Render the component with router
    render(
      <MemoryRouter initialEntries={['/oauth-playground/auth-code-pkce']}>
        <Routes>
          <Route path="/oauth-playground/auth-code-pkce" element={<AuthCodeWithPkceFlow />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Verify the state is restored and we're on the token exchange step
    await waitFor(() => {
      expect(screen.getByText('Token Exchange')).toBeInTheDocument();
      expect(screen.getByText(authCode)).toBeInTheDocument();
    });
  });
  
  // Test coming back from a redirect
  test('should handle returning from a redirect with code in location state', async () => {
    // Setup the configuration in localStorage
    const savedConfig = {
      clientId: 'redirect-client-id',
      redirectUri: 'http://localhost:3000/callback',
      scopes: ['openid', 'profile'],
      demoMode: true
    };
    
    const savedPkce = {
      codeVerifier: mockCodeVerifier,
      codeChallenge: mockCodeChallenge,
      state: mockState
    };
    
    mockLocalStorage.setItem('oauth_playground_config', JSON.stringify(savedConfig));
    mockLocalStorage.setItem('oauth_playground_pkce', JSON.stringify(savedPkce));
    
    const authCode = 'redirect_authorization_code';
    
    // Render with location state containing the code
    render(
      <MemoryRouter 
        initialEntries={[{
          pathname: '/oauth-playground/auth-code-pkce',
          state: { code: authCode, state: mockState }
        }]}
      >
        <Routes>
          <Route path="/oauth-playground/auth-code-pkce" element={<AuthCodeWithPkceFlow />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Verify we're on the token exchange step with the code from location state
    await waitFor(() => {
      expect(screen.getByText('Token Exchange')).toBeInTheDocument();
      expect(screen.getByText(authCode)).toBeInTheDocument();
    });
  });
});
