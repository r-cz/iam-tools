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
import { TokenInspector } from '@/features/tokenInspector';
import { setupApiMocks, sampleJwt, sampleJwksResponse } from '../utils/test-api-mocks';
import { verifySignatureWithRefresh } from '@/lib/jwt/verify-signature-with-refresh';

// Mock the verify signature function
jest.mock('@/lib/jwt/verify-signature-with-refresh', () => ({
  verifySignatureWithRefresh: jest.fn()
}));

// Mock local storage for token history
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

// Define test tokens
const validIdToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LTEifQ.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiMTIzNDU2Nzg5MCIsImF1ZCI6ImNsaWVudF9pZCIsImV4cCI6MTk1MTYyMzkwMjIsImlhdCI6MTUxNjIzOTAyMiwibmFtZSI6IkpvaG4gRG9lIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0.XVTrLlRR5rIGkCwLPPq9m6SQz0mEcpfiWFRGh1PtHR4';

const validAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6InRlc3Qta2V5LTEifQ.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiMTIzNDU2Nzg5MCIsImF1ZCI6InJlc291cmNlX2lkIiwiZXhwIjoxOTUxNjIzOTAyMiwiaWF0IjoxNTE2MjM5MDIyLCJzY29wZSI6InJlYWQgd3JpdGUiLCJjbGllbnRfaWQiOiJjbGllbnRfYWJjIn0.Z_KRfiJBUlU_zvYQgJrrzTZ9spBbPrNKmPZZBbg0emU';

const invalidToken = 'thisisnotavalidtoken';

const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LTEifQ.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiMTIzNDU2Nzg5MCIsImF1ZCI6ImNsaWVudF9pZCIsImV4cCI6MTUxNjIzOTAyMiwiaWF0IjoxNTE2MjM4MDIyLCJuYW1lIjoiSm9obiBEb2UiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20ifQ.pZGjcZjnsFNpn7eQUuEBKTrXWXTpUAX5dh3rYTDUqlQ';

// Create a page object model for TokenInspector
class TokenInspectorPage {
  inputToken(token: string) {
    const input = screen.getByTestId('token-input');
    fireEvent.change(input, { target: { value: token } });
    return this;
  }

  clickInspectButton() {
    const button = screen.getByRole('button', { name: /inspect token/i });
    fireEvent.click(button);
    return this;
  }

  clickResetButton() {
    const button = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(button);
    return this;
  }

  clickHeaderTab() {
    const tab = screen.getByRole('tab', { name: /header/i });
    fireEvent.click(tab);
    return this;
  }

  clickPayloadTab() {
    const tab = screen.getByRole('tab', { name: /payload/i });
    fireEvent.click(tab);
    return this;
  }

  clickSignatureTab() {
    const tab = screen.getByRole('tab', { name: /signature/i });
    fireEvent.click(tab);
    return this;
  }

  clickTimelineTab() {
    const tab = screen.getByRole('tab', { name: /timeline/i });
    fireEvent.click(tab);
    return this;
  }

  async expectTokenTypeLabel(type: string) {
    await waitFor(() => {
      expect(screen.getByText(type, { exact: false })).toBeInTheDocument();
    });
    return this;
  }

  async expectSignatureStatus(status: string) {
    await waitFor(() => {
      expect(screen.getByText(status, { exact: false })).toBeInTheDocument();
    });
    return this;
  }

  async expectHeaderToContain(key: string, value: string) {
    this.clickHeaderTab();
    await waitFor(() => {
      expect(screen.getByText(key, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(value, { exact: false })).toBeInTheDocument();
    });
    return this;
  }

  async expectPayloadToContain(key: string, value: string) {
    this.clickPayloadTab();
    await waitFor(() => {
      expect(screen.getByText(key, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(value, { exact: false })).toBeInTheDocument();
    });
    return this;
  }

  async expectTokenError(errorMessage: string) {
    await waitFor(() => {
      expect(screen.getByText(errorMessage, { exact: false })).toBeInTheDocument();
    });
    return this;
  }

  async expectTimelineToContain(text: string) {
    this.clickTimelineTab();
    await waitFor(() => {
      expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
    });
    return this;
  }
}

describe('Token Inspector Comprehensive Tests', () => {
  // Setup API mocks and localStorage
  let apiMocks: ReturnType<typeof setupApiMocks>;
  let localStorage: ReturnType<typeof mockLocalStorage>;
  let page: TokenInspectorPage;
  
  beforeEach(() => {
    apiMocks = setupApiMocks();
    localStorage = mockLocalStorage();
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
    });

    // Setup API mocks for JWKS endpoint
    apiMocks.mockSuccess('https://example.com/.well-known/jwks.json', sampleJwksResponse);
    apiMocks.mockSuccess('https://example.com/.well-known/jwks', sampleJwksResponse);
    
    // Mock the OIDC config endpoint
    apiMocks.mockSuccess('https://example.com/.well-known/openid-configuration', {
      issuer: "https://example.com",
      jwks_uri: "https://example.com/.well-known/jwks.json"
    });

    // Mock signature verification
    (verifySignatureWithRefresh as jest.Mock).mockResolvedValue({
      valid: true,
      error: undefined
    });
    
    // Initialize page object
    page = new TokenInspectorPage();
  });

  afterEach(() => {
    apiMocks.restore();
    jest.resetAllMocks();
  });

  test('should properly decode and display ID token components', async () => {
    renderWithProviders(<TokenInspector />);
    
    await page
      .inputToken(validIdToken)
      .clickInspectButton()
      .expectTokenTypeLabel('OIDC ID Token')
      .expectHeaderToContain('alg', 'HS256')
      .expectHeaderToContain('typ', 'JWT')
      .expectHeaderToContain('kid', 'test-key-1')
      .expectPayloadToContain('iss', 'https://example.com')
      .expectPayloadToContain('sub', '1234567890')
      .expectPayloadToContain('name', 'John Doe')
      .expectPayloadToContain('email', 'john@example.com');
  });

  test('should properly decode and display access token components', async () => {
    renderWithProviders(<TokenInspector />);
    
    await page
      .inputToken(validAccessToken)
      .clickInspectButton()
      .expectTokenTypeLabel('OAuth JWT Access Token')
      .expectHeaderToContain('alg', 'HS256')
      .expectHeaderToContain('typ', 'at+jwt')
      .expectHeaderToContain('kid', 'test-key-1')
      .expectPayloadToContain('iss', 'https://example.com')
      .expectPayloadToContain('sub', '1234567890')
      .expectPayloadToContain('scope', 'read write')
      .expectPayloadToContain('client_id', 'client_abc');
  });

  test('should display error for invalid token format', async () => {
    renderWithProviders(<TokenInspector />);
    
    await page
      .inputToken(invalidToken)
      .clickInspectButton()
      .expectTokenError('Invalid token');
  });

  test('should verify signature and display valid status', async () => {
    (verifySignatureWithRefresh as jest.Mock).mockResolvedValue({
      valid: true,
      error: undefined
    });

    renderWithProviders(<TokenInspector />);
    
    await page
      .inputToken(validIdToken)
      .clickInspectButton()
      .expectSignatureStatus('Signature Valid');
  });

  test('should show invalid status for failed signature verification', async () => {
    (verifySignatureWithRefresh as jest.Mock).mockResolvedValue({
      valid: false,
      error: "Signature verification failed"
    });

    renderWithProviders(<TokenInspector />);
    
    await page
      .inputToken(validIdToken)
      .clickInspectButton()
      .expectSignatureStatus('Signature Invalid');
  });

  test('should display token timeline with expiration information', async () => {
    const now = new Date();
    // Mock Date.now to return a fixed time
    const realDateNow = Date.now;
    Date.now = jest.fn(() => 1516239000000); // Fixed timestamp within the token's validity period
    
    renderWithProviders(<TokenInspector />);
    
    await page
      .inputToken(validIdToken)
      .clickInspectButton()
      .expectTimelineToContain('Issued at')
      .expectTimelineToContain('January 18, 2018')
      .expectTimelineToContain('Expires at')
      .expectTimelineToContain('January 01, 2032');
    
    // Restore the original Date.now
    Date.now = realDateNow;
  });

  test('should indicate expired token in timeline', async () => {
    const now = new Date();
    // Mock Date.now to return a fixed time after expiration
    const realDateNow = Date.now;
    Date.now = jest.fn(() => 1516240000000); // Fixed timestamp after the token's expiration
    
    renderWithProviders(<TokenInspector />);
    
    await page
      .inputToken(expiredToken)
      .clickInspectButton()
      .expectTimelineToContain('Expired')
      .expectTimelineToContain('(expired)');
    
    // Restore the original Date.now
    Date.now = realDateNow;
  });

  test('should reset state correctly', async () => {
    renderWithProviders(<TokenInspector />);
    
    await page
      .inputToken(validIdToken)
      .clickInspectButton()
      .expectTokenTypeLabel('OIDC ID Token');
    
    page
      .clickResetButton();
    
    // The token input should be cleared
    const input = screen.getByTestId('token-input');
    expect(input).toHaveValue('');
    
    // The decoded token components should no longer be displayed
    expect(screen.queryByText('OIDC ID Token')).not.toBeInTheDocument();
  });

  test('should store token in history and display it', async () => {
    // Set up the mock localStorage with existing tokens
    localStorage.setItem('token_history', JSON.stringify([
      { timestamp: Date.now() - 1000, token: 'previous_token' }
    ]));
    
    renderWithProviders(<TokenInspector />);
    
    await page
      .inputToken(validIdToken)
      .clickInspectButton();
    
    // Verify token was added to history
    await waitFor(() => {
      const historyStorage = JSON.parse(localStorage.getItem('token_history') || '[]');
      expect(historyStorage).toHaveLength(2);
      expect(historyStorage[0].token).toBe(validIdToken);
    });
  });
});