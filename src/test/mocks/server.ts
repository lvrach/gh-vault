import { setupServer } from 'msw/node';

import { handlers } from './github-handlers.js';

export const mockServer = setupServer(...handlers);
