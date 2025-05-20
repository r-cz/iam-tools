import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  mock,
  renderWithProviders,
  screen,
  waitFor,
  fireEvent
} from '../utils/test-utils';
import { OAuthPlaygroundPage } from '@/features/oauthPlayground';
import { AuthCodeWithPkceFlow } from '@/features/oauthPlayground/components/AuthCodeWithPkceFlow';
import { TokenIntrospection } from '@/features/oauthPlayground/components/TokenIntrospection';
import { UserInfo } from '@/features/oauthPlayground/components/UserInfo';
import { ClientCredentialsFlow } from '@/features/oauthPlayground/components/ClientCredentialsFlow';
import { setupApiMocks } from '../utils/test-api-mocks';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OAuthFlowType } from '@/features/oauthPlayground/utils/types';

// Mock crypto for PKCE code generation
const mockCrypto = {
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    digest: async (algorithm: string, data: ArrayBuffer) => {
      // Just return the same data for testing purposes
      return data;
    }
  }
};

// Mock localStorage for persisting OAuth configuration
const mockLocalStorage = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getAllItems: () => store
  };
};

// Page Object Models

// Main Navigation Page Object
class OAuthNavigationPage {
  async clickAuthCodeWithPkce() {
    const link = await screen.findByText('Authorization Code with PKCE');
    fireEvent.click(link);
    return this;
  }

  async clickClientCredentials() {
    const link = await screen.findByText('Client Credentials');
    fireEvent.click(link);
    return this;
  }

  async clickTokenIntrospection() {
    const link = await screen.findByText('Token Introspection');
    fireEvent.click(link);
    return this;
  }

  async clickUserInfo() {
    const link = await screen.findByText('UserInfo Endpoint');
    fireEvent.click(link);
    return this;
  }
}

// Auth Code with PKCE Page Object
class AuthCodeWithPkcePage {
  fillIssuerUrl(url: string) {
    const input = screen.getByLabelText(/issuer url/i);
    fireEvent.change(input, { target: { value: url } });
    return this;
  }

  fillClientId(clientId: string) {
    const input = screen.getByLabelText(/client id/i);
    fireEvent.change(input, { target: { value: clientId } });
    return this;
  }

  fillRedirectUri(redirectUri: string) {
    const input = screen.getByLabelText(/redirect uri/i);
    fireEvent.change(input, { target: { value: redirectUri } });
    return this;
  }

  fillScopes(scopes: string) {
    const input = screen.getByLabelText(/scopes/i);
    fireEvent.change(input, { target: { value: scopes } });
    return this;
  }

  clickGeneratePkce() {
    const button = screen.getByText(/generate pkce/i);
    fireEvent.click(button);
    return this;
  }

  clickStartAuthorizationFlow() {
    const button = screen.getByText(/start authorization flow/i);
    fireEvent.click(button);
    return this;
  }

  async expectVerifierAndChallenge() {
    await waitFor(() => {
      expect(screen.getByText(/code verifier/i)).toBeInTheDocument();
      expect(screen.getByText(/code challenge/i)).toBeInTheDocument();
    });
    return this;
  }

  async expectAuthorizationUrl() {
    await waitFor(() => {
      expect(screen.getByText(/authorization request url/i)).toBeInTheDocument();
    });
    return this;
  }
}

// Client Credentials Page Object
class ClientCredentialsPage {
  fillTokenEndpoint(endpoint: string) {
    const input = screen.getByLabelText(/token endpoint/i);
    fireEvent.change(input, { target: { value: endpoint } });
    return this;
  }

  fillClientId(clientId: string) {
    const input = screen.getByLabelText(/client id/i);
    fireEvent.change(input, { target: { value: clientId } });
    return this;
  }

  fillClientSecret(secret: string) {
    const input = screen.getByLabelText(/client secret/i);
    fireEvent.change(input, { target: { value: secret } });
    return this;
  }

  fillScopes(scopes: string) {
    const input = screen.getByLabelText(/scopes/i);
    fireEvent.change(input, { target: { value: scopes } });
    return this;
  }

  clickRequestToken() {
    const button = screen.getByText(/request token/i);
    fireEvent.click(button);
    return this;
  }

  async expectTokenResponse(tokenType: string) {
    await waitFor(() => {
      expect(screen.getByText(/access token/i)).toBeInTheDocument();
      expect(screen.getByText(tokenType)).toBeInTheDocument();
    });
    return this;
  }

  async expectError(errorText: string) {
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(errorText, { exact: false })).toBeInTheDocument();
    });
    return this;
  }
}

// Introspection Page Object
class IntrospectionPage {
  fillIntrospectionEndpoint(endpoint: string) {
    const input = screen.getByLabelText(/introspection endpoint/i);
    fireEvent.change(input, { target: { value: endpoint } });
    return this;
  }

  fillToken(token: string) {
    const input = screen.getByLabelText(/token/i);
    fireEvent.change(input, { target: { value: token } });
    return this;
  }

  fillClientId(clientId: string) {
    const input = screen.getByLabelText(/client id/i);
    fireEvent.change(input, { target: { value: clientId } });
    return this;
  }

  fillClientSecret(secret: string) {
    const input = screen.getByLabelText(/client secret/i);
    fireEvent.change(input, { target: { value: secret } });
    return this;
  }

  clickIntrospect() {
    const button = screen.getByText(/introspect token/i);
    fireEvent.click(button);
    return this;
  }

  async expectIntrospectionResponse(active: boolean) {
    await waitFor(() => {
      expect(screen.getByText(/introspection result/i)).toBeInTheDocument();
      expect(screen.getByText(`"active": ${active}`)).toBeInTheDocument();
    });
    return this;
  }
}

// UserInfo Page Object
class UserInfoPage {
  fillUserInfoEndpoint(endpoint: string) {
    const input = screen.getByLabelText(/userinfo endpoint/i);
    fireEvent.change(input, { target: { value: endpoint } });
    return this;
  }

  fillAccessToken(token: string) {
    const input = screen.getByLabelText(/access token/i);
    fireEvent.change(input, { target: { value: token } });
    return this;
  }

  clickFetchUserInfo() {
    const button = screen.getByText(/fetch user info/i);
    fireEvent.click(button);
    return this;
  }

  async expectUserInfoResponse(name: string, email: string) {
    await waitFor(() => {
      expect(screen.getByText(/user info result/i)).toBeInTheDocument();
      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getByText(email)).toBeInTheDocument();
    });
    return this;
  }
}

// Render component with router
const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  
  return renderWithProviders(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/oauth-playground" element={<OAuthPlaygroundPage />} />
        <Route path="/oauth-playground/auth-code-pkce" element={<AuthCodeWithPkceFlow />} />
        <Route path="/oauth-playground/client-credentials" element={<ClientCredentialsFlow />} />
        <Route path="/oauth-playground/introspection" element={<TokenIntrospection />} />
        <Route path="/oauth-playground/userinfo" element={<UserInfo />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('OAuth Playground Comprehensive Tests', () => {
  // Setup API mocks and localStorage
  let apiMocks: ReturnType<typeof setupApiMocks>;
  let localStorage: ReturnType<typeof mockLocalStorage>;
  let navigationPage: OAuthNavigationPage;
  
  beforeEach(() => {
    apiMocks = setupApiMocks();
    localStorage = mockLocalStorage();
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
    });
    
    Object.defineProperty(window, 'crypto', {
      value: mockCrypto
    });
    
    // Initialize page object
    navigationPage = new OAuthNavigationPage();
  });

  afterEach(() => {
    apiMocks.restore();
  });

  describe('Navigation and Main Page', () => {
    test('should display all available OAuth flows', async () => {
      renderWithRouter(<OAuthPlaygroundPage />);
      
      // Wait for the page to load
      await waitFor(() => {
        expect(screen.getByText('OAuth 2.0 Playground')).toBeInTheDocument();
      });
      
      // Check that all flow cards are displayed
      expect(screen.getByText('Authorization Code with PKCE')).toBeInTheDocument();
      expect(screen.getByText('Client Credentials')).toBeInTheDocument();
      expect(screen.getByText('Token Introspection')).toBeInTheDocument();
      expect(screen.getByText('UserInfo Endpoint')).toBeInTheDocument();
    });
  });

  describe('Authorization Code with PKCE Flow', () => {
    test('should generate PKCE code verifier and challenge', async () => {
      renderWithRouter(<AuthCodeWithPkceFlow />, { route: '/oauth-playground/auth-code-pkce' });
      
      const page = new AuthCodeWithPkcePage();
      
      await page
        .fillIssuerUrl('https://example.com')
        .fillClientId('test-client')
        .fillRedirectUri('http://localhost:3000/callback')
        .fillScopes('openid profile email')
        .clickGeneratePkce()
        .expectVerifierAndChallenge();
    });

    test('should generate authorization URL with correct parameters', async () => {
      renderWithRouter(<AuthCodeWithPkceFlow />, { route: '/oauth-playground/auth-code-pkce' });
      
      // Mock OIDC configuration response
      apiMocks.mockSuccess('https://example.com/.well-known/openid-configuration', {
        issuer: 'https://example.com',
        authorization_endpoint: 'https://example.com/oauth2/auth'
      });
      
      const page = new AuthCodeWithPkcePage();
      
      await page
        .fillIssuerUrl('https://example.com')
        .fillClientId('test-client')
        .fillRedirectUri('http://localhost:3000/callback')
        .fillScopes('openid profile email')
        .clickGeneratePkce();
      
      // Click the start flow button
      page.clickStartAuthorizationFlow();
      
      // Check that authorization URL is generated
      await page.expectAuthorizationUrl();
    });
  });

  describe('Client Credentials Flow', () => {
    test('should request token with client credentials', async () => {
      renderWithRouter(<ClientCredentialsFlow />, { route: '/oauth-playground/client-credentials' });
      
      // Mock token endpoint response
      apiMocks.mockSuccess('https://example.com/oauth2/token', {
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write'
      });
      
      const page = new ClientCredentialsPage();
      
      await page
        .fillTokenEndpoint('https://example.com/oauth2/token')
        .fillClientId('test-client')
        .fillClientSecret('test-secret')
        .fillScopes('read write')
        .clickRequestToken()
        .expectTokenResponse('Bearer');
    });

    test('should handle token request errors', async () => {
      renderWithRouter(<ClientCredentialsFlow />, { route: '/oauth-playground/client-credentials' });
      
      // Mock token endpoint error response
      apiMocks.mockError('https://example.com/oauth2/token', {
        error: 'invalid_client',
        error_description: 'Client authentication failed'
      }, 401);
      
      const page = new ClientCredentialsPage();
      
      await page
        .fillTokenEndpoint('https://example.com/oauth2/token')
        .fillClientId('invalid-client')
        .fillClientSecret('wrong-secret')
        .fillScopes('read write')
        .clickRequestToken()
        .expectError('Client authentication failed');
    });
  });

  describe('Token Introspection', () => {
    test('should introspect valid token', async () => {
      renderWithRouter(<TokenIntrospection />, { route: '/oauth-playground/introspection' });
      
      // Mock introspection endpoint response for active token
      apiMocks.mockSuccess('https://example.com/oauth2/introspect', {
        active: true,
        client_id: 'test-client',
        username: 'test-user',
        scope: 'read write',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60
      });
      
      const page = new IntrospectionPage();
      
      await page
        .fillIntrospectionEndpoint('https://example.com/oauth2/introspect')
        .fillToken('valid_token')
        .fillClientId('test-client')
        .fillClientSecret('test-secret')
        .clickIntrospect()
        .expectIntrospectionResponse(true);
    });

    test('should introspect invalid token', async () => {
      renderWithRouter(<TokenIntrospection />, { route: '/oauth-playground/introspection' });
      
      // Mock introspection endpoint response for inactive token
      apiMocks.mockSuccess('https://example.com/oauth2/introspect', {
        active: false
      });
      
      const page = new IntrospectionPage();
      
      await page
        .fillIntrospectionEndpoint('https://example.com/oauth2/introspect')
        .fillToken('expired_token')
        .fillClientId('test-client')
        .fillClientSecret('test-secret')
        .clickIntrospect()
        .expectIntrospectionResponse(false);
    });
  });

  describe('UserInfo Endpoint', () => {
    test('should fetch user information with access token', async () => {
      renderWithRouter(<UserInfo />, { route: '/oauth-playground/userinfo' });
      
      // Mock userinfo endpoint response
      apiMocks.mockSuccess('https://example.com/oauth2/userinfo', {
        sub: '123456789',
        name: 'John Doe',
        email: 'john@example.com',
        email_verified: true,
        picture: 'https://example.com/profile.jpg'
      });
      
      const page = new UserInfoPage();
      
      await page
        .fillUserInfoEndpoint('https://example.com/oauth2/userinfo')
        .fillAccessToken('valid_access_token')
        .clickFetchUserInfo()
        .expectUserInfoResponse('John Doe', 'john@example.com');
    });
  });
});