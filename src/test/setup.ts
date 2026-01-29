import { vi } from 'vitest';

// Mock the secrets module so tests don't require actual keychain access
vi.mock('../lib/secrets.js', () => ({
  getToken: vi.fn().mockResolvedValue('ghp_test_token_for_testing_purposes_x'),
  setToken: vi.fn().mockResolvedValue(undefined),
  deleteToken: vi.fn().mockResolvedValue(undefined),
  validateTokenFormat: vi.fn().mockReturnValue({ valid: true, type: 'classic' }),
}));
