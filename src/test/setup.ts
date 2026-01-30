import { afterAll, afterEach, beforeAll } from 'vitest';
import { vi } from 'vitest';

import { mockServer } from './mocks/server.js';

// Mock the secrets module so tests don't require actual keychain access
vi.mock('../shared/secrets.js', () => ({
  getToken: vi.fn().mockResolvedValue('ghp_test_token_for_testing_purposes_x'),
  setToken: vi.fn().mockResolvedValue(undefined),
  deleteToken: vi.fn().mockResolvedValue(undefined),
  validateTokenFormat: vi.fn().mockReturnValue({ valid: true, type: 'classic' }),
}));

// Start MSW server once for all tests (performance optimization)
beforeAll(() => {
  mockServer.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  mockServer.resetHandlers();
});

afterAll(() => {
  mockServer.close();
});
