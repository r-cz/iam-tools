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
import { OidcExplorer } from '@/features/oidcExplorer';
import { setupApiMocks, sampleOidcConfigResponse, sampleJwksResponse } from '../utils/test-api-mocks';

// Mock local storage for issuer history
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

// Page Object Model for OIDC Explorer
class OidcExplorerPage {
  enterIssuerUrl(url: string) {
    const input = screen.getByPlaceholderText('https://auth.example.com');
    fireEvent.change(input, { target: { value: url } });
    return this;
  }

  clickFetchButton() {
    const button = screen.getByRole('button', { name: /fetch configuration/i });
    fireEvent.click(button);
    return this;
  }

  clickConfigTab() {
    const tab = screen.getByRole('tab', { name: /configuration/i });
    fireEvent.click(tab);
    return this;
  }

  clickJwksTab() {
    const tab = screen.getByRole('tab', { name: /jwks/i });
    fireEvent.click(tab);
    return this;
  }

  async expectProviderInfo(providerName: string) {
    await waitFor(() => {
      expect(screen.getByText(providerName, { exact: false })).toBeInTheDocument();
    });
    return this;
  }

  async expectConfigToContain(key: string, value: string) {
    this.clickConfigTab();
    await waitFor(() => {
      expect(screen.getByText(key, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(value, { exact: false })).toBeInTheDocument();
    });
    return this;
  }

  async expectJwksToContain(text: string) {
    this.clickJwksTab();
    await waitFor(() => {
      expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
    });
    return this;
  }

  async expectLoading() {
    await waitFor(() => {
      expect(screen.getByText(/fetching configuration/i)).toBeInTheDocument();
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

  async expectIssuerInHistory(issuerUrl: string) {
    await waitFor(() => {
      // The history component should show the issuer URL
      const historyElement = screen.getByText(issuerUrl);
      expect(historyElement).toBeInTheDocument();
    });
    return this;
  }
}

describe('OIDC Explorer Comprehensive Tests', () => {
  // Setup API mocks and localStorage
  let apiMocks: ReturnType<typeof setupApiMocks>;
  let localStorage: ReturnType<typeof mockLocalStorage>;
  let page: OidcExplorerPage;
  
  beforeEach(() => {
    apiMocks = setupApiMocks();
    localStorage = mockLocalStorage();
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
    });
    
    // Initialize page object
    page = new OidcExplorerPage();
  });

  afterEach(() => {
    apiMocks.restore();
  });

  test('should fetch and display OIDC configuration', async () => {
    // Mock the OIDC configuration endpoint
    apiMocks.mockSuccess(
      'https://example.com/.well-known/openid-configuration', 
      sampleOidcConfigResponse
    );
    
    renderWithProviders(<OidcExplorer />);
    
    await page
      .enterIssuerUrl('https://example.com')
      .clickFetchButton()
      .expectConfigToContain('issuer', 'https://example.com')
      .expectConfigToContain('authorization_endpoint', 'https://example.com/oauth2/authorize')
      .expectConfigToContain('token_endpoint', 'https://example.com/oauth2/token')
      .expectConfigToContain('jwks_uri', 'https://example.com/.well-known/jwks.json');
  });

  test('should fetch and display JWKS', async () => {
    // Mock the OIDC configuration endpoint
    apiMocks.mockSuccess(
      'https://example.com/.well-known/openid-configuration', 
      sampleOidcConfigResponse
    );
    
    // Mock the JWKS endpoint
    apiMocks.mockSuccess(
      'https://example.com/.well-known/jwks.json', 
      sampleJwksResponse
    );
    
    renderWithProviders(<OidcExplorer />);
    
    await page
      .enterIssuerUrl('https://example.com')
      .clickFetchButton()
      .expectJwksToContain('test-key-1')
      .expectJwksToContain('RS256');
  });

  test('should detect and display provider information', async () => {
    // Mock Auth0 OIDC configuration
    const auth0Config = {
      ...sampleOidcConfigResponse,
      issuer: 'https://tenant.auth0.com/',
    };
    
    apiMocks.mockSuccess(
      'https://tenant.auth0.com/.well-known/openid-configuration', 
      auth0Config
    );
    
    renderWithProviders(<OidcExplorer />);
    
    await page
      .enterIssuerUrl('https://tenant.auth0.com')
      .clickFetchButton()
      .expectProviderInfo('Auth0');
  });

  test('should detect and display Okta provider information', async () => {
    // Mock Okta OIDC configuration
    const oktaConfig = {
      ...sampleOidcConfigResponse,
      issuer: 'https://example.okta.com/',
    };
    
    apiMocks.mockSuccess(
      'https://example.okta.com/.well-known/openid-configuration', 
      oktaConfig
    );
    
    renderWithProviders(<OidcExplorer />);
    
    await page
      .enterIssuerUrl('https://example.okta.com')
      .clickFetchButton()
      .expectProviderInfo('Okta');
  });

  test('should display loading state while fetching configuration', async () => {
    // Don't resolve the mock immediately to observe loading state
    const pendingPromise = new Promise(() => {});
    apiMocks.mockSuccess(
      'https://example.com/.well-known/openid-configuration', 
      pendingPromise
    );
    
    renderWithProviders(<OidcExplorer />);
    
    await page
      .enterIssuerUrl('https://example.com')
      .clickFetchButton()
      .expectLoading();
  });

  test('should display error message when configuration fetch fails', async () => {
    // Mock a failed response
    apiMocks.mockError(
      'https://example.com/.well-known/openid-configuration', 
      { error: 'Failed to fetch configuration' },
      404
    );
    
    renderWithProviders(<OidcExplorer />);
    
    await page
      .enterIssuerUrl('https://example.com')
      .clickFetchButton()
      .expectError('Failed to fetch configuration');
  });

  test('should display error when JWKS fetch fails', async () => {
    // Mock successful OIDC config
    apiMocks.mockSuccess(
      'https://example.com/.well-known/openid-configuration', 
      sampleOidcConfigResponse
    );
    
    // Mock failed JWKS response
    apiMocks.mockError(
      'https://example.com/.well-known/jwks.json', 
      { error: 'Failed to fetch JWKS' },
      404
    );
    
    renderWithProviders(<OidcExplorer />);
    
    await page
      .enterIssuerUrl('https://example.com')
      .clickFetchButton()
      .expectError('Failed to fetch JWKS');
  });

  test('should add issuer to history and display it', async () => {
    // Mock the OIDC configuration endpoint
    apiMocks.mockSuccess(
      'https://example.com/.well-known/openid-configuration', 
      sampleOidcConfigResponse
    );
    
    renderWithProviders(<OidcExplorer />);
    
    await page
      .enterIssuerUrl('https://example.com')
      .clickFetchButton();
    
    // Verify issuer was added to history in localStorage
    await waitFor(() => {
      const historyStorage = JSON.parse(localStorage.getItem('issuer_history') || '[]');
      expect(historyStorage).toContainEqual(expect.objectContaining({
        issuer: 'https://example.com'
      }));
    });
    
    // Verify the issuer appears in the history component
    await page.expectIssuerInHistory('https://example.com');
  });

  test('should load configuration when selecting from history', async () => {
    // Set up the mock localStorage with existing issuer
    localStorage.setItem('issuer_history', JSON.stringify([
      { timestamp: Date.now(), issuer: 'https://example.com' }
    ]));
    
    // Mock the OIDC configuration endpoint
    apiMocks.mockSuccess(
      'https://example.com/.well-known/openid-configuration', 
      sampleOidcConfigResponse
    );
    
    renderWithProviders(<OidcExplorer />);
    
    // Find and click on the history item
    const historyItem = await screen.findByText('https://example.com');
    fireEvent.click(historyItem);
    
    // Verify configuration is loaded
    await page.expectConfigToContain('issuer', 'https://example.com');
  });
});