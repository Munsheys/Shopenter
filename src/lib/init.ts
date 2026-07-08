/**
 * Initialization code that runs when the server starts
 * This validates environment variables and sets up global state
 */

import { validateSecrets } from './validateSecrets';

// Validate secrets on startup
if (typeof window === 'undefined') {
  // Server-side only
  validateSecrets();
}
