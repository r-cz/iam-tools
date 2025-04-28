import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { onRequest } from './_middleware'; // Import the middleware function

describe('_middleware onRequest', () => {
  // Mock the Cloudflare Pages Function context
  const mockContext: any = {
    request: new Request('http://localhost/some-path', { method: 'GET' }),
    next: mock(), // Mock the next function
    // Add other context properties if needed by the middleware
  };

  beforeEach(() => {
    // Reset the mock before each test
    mockContext.next.mockClear();
  });

  test('should handle OPTIONS requests and return CORS headers', async () => {
    const optionsContext: any = {
      request: new Request('http://localhost/some-path', { method: 'OPTIONS' }),
      next: mock(),
    };

    const response = await onRequest(optionsContext);

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    expect(optionsContext.next).not.toHaveBeenCalled(); // next() should not be called for OPTIONS
  });

  test('should call context.next() for non-OPTIONS requests', async () => {
    const getContext: any = {
      request: new Request('http://localhost/some-path', { method: 'GET' }),
      next: mock(),
    };

    // Mock the response from context.next()
    const mockNextResponse = new Response('Next response');
    getContext.next.mockResolvedValue(mockNextResponse);

    const response = await onRequest(getContext);

    expect(getContext.next).toHaveBeenCalledTimes(1); // next() should be called once
    expect(response).toBe(mockNextResponse); // The middleware should return the response from next()
  });

  test('should call context.next() for POST requests', async () => {
    const postContext: any = {
      request: new Request('http://localhost/some-path', { method: 'POST', body: 'data' }),
      next: mock(),
    };

    const mockNextResponse = new Response('Next response');
    postContext.next.mockResolvedValue(mockNextResponse);

    const response = await onRequest(postContext);

    expect(postContext.next).toHaveBeenCalledTimes(1);
    expect(response).toBe(mockNextResponse);
  });
});