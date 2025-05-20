import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserInfo } from '@/features/oauthPlayground/components/UserInfo';
import { MemoryRouter } from 'react-router-dom';
import { AppStateProvider } from '@/lib/state';

// Mock proxyFetch function
vi.mock('@/lib/proxy-fetch', () => ({
  proxyFetch: vi.fn().mockImplementation((url) => {
    if (url.includes('.well-known/openid-configuration')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          userinfo_endpoint: 'https://example.com/oauth/userinfo'
        })
      });
    } else if (url.includes('/userinfo')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          sub: 'test-subject',
          name: 'Test User',
          email: 'test@example.com',
          email_verified: true
        })
      });
    }
    return Promise.reject(new Error('Not found'));
  })
}));

// Mock navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate
  };
});

describe('UserInfo Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders UserInfo component with all main elements', () => {
    render(
      <MemoryRouter>
        <AppStateProvider>
          <UserInfo />
        </AppStateProvider>
      </MemoryRouter>
    );

    // Check for main UI elements
    expect(screen.getByText('Demo Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('UserInfo Endpoint')).toBeInTheDocument();
    expect(screen.getByLabelText('Access Token')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get UserInfo|Generate Demo UserInfo/i })).toBeInTheDocument();
  });

  test('demo mode toggle works and shows demo data', async () => {
    render(
      <MemoryRouter>
        <AppStateProvider>
          <UserInfo />
        </AppStateProvider>
      </MemoryRouter>
    );

    // Enable demo mode
    const demoModeSwitch = screen.getByRole('switch', { name: /Demo Mode/i });
    fireEvent.click(demoModeSwitch);

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Generate Demo UserInfo/i });
    fireEvent.click(submitButton);

    // Wait for demo response
    await waitFor(() => {
      expect(screen.getByText('UserInfo Result')).toBeInTheDocument();
      expect(screen.getByText('Demo User')).toBeInTheDocument();
      expect(screen.getByText('demo@example.com')).toBeInTheDocument();
    });

    // Verify the result has the Demo Response badge
    expect(screen.getByText('Demo Response')).toBeInTheDocument();
  });

  test('navigates to token inspector when button is clicked', async () => {
    render(
      <MemoryRouter>
        <AppStateProvider>
          <UserInfo />
        </AppStateProvider>
      </MemoryRouter>
    );

    // Fill in the access token
    const accessTokenInput = screen.getByLabelText('Access Token');
    fireEvent.change(accessTokenInput, { target: { value: 'test-token' } });

    // Click the "View in Token Inspector" button
    const inspectButton = screen.getByRole('button', { name: /View in Token Inspector/i });
    fireEvent.click(inspectButton);

    // Verify navigate was called with correct URL
    expect(mockNavigate).toHaveBeenCalledWith('/token-inspector?token=test-token');
  });
  
  test('recent tokens button is not shown when history is empty', () => {
    render(
      <MemoryRouter>
        <AppStateProvider>
          <UserInfo />
        </AppStateProvider>
      </MemoryRouter>
    );
    
    // The Recent Tokens button should not be visible when token history is empty
    const recentTokensButton = screen.queryByRole('button', { name: /Recent Tokens/i });
    expect(recentTokensButton).not.toBeInTheDocument();
  });
  
  test('adds token to history and shows recent tokens button after successful request', async () => {
    // Mock the useAppState hook to simulate token history
    vi.mocked(proxyFetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        sub: 'test-subject',
        name: 'Test User',
        email: 'test@example.com'
      })
    } as Response);
    
    const { rerender } = render(
      <MemoryRouter>
        <AppStateProvider>
          <UserInfo />
        </AppStateProvider>
      </MemoryRouter>
    );
    
    // Set up form
    const userInfoEndpointInput = screen.getByLabelText('UserInfo Endpoint');
    const accessTokenInput = screen.getByLabelText('Access Token');
    const submitButton = screen.getByRole('button', { name: /Get UserInfo/i });
    
    // Fill out form and submit
    fireEvent.change(userInfoEndpointInput, { target: { value: 'https://example.com/oauth/userinfo' } });
    fireEvent.change(accessTokenInput, { target: { value: 'new-test-token' } });
    fireEvent.click(submitButton);
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    
    // Force a rerender to simulate state update
    rerender(
      <MemoryRouter>
        <AppStateProvider>
          <UserInfo />
        </AppStateProvider>
      </MemoryRouter>
    );
    
    // After successful request, the Recent Tokens button should be available
    // Note: This test may be flaky depending on how state is managed in your tests
    // In a real application, this would work, but in tests you might need special setup
    const recentTokensButton = screen.queryByRole('button', { name: /Recent Tokens/i });
    expect(recentTokensButton).toBeInTheDocument();
  });
});