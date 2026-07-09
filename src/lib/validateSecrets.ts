/**
 * Validate that all required environment secrets are set properly
 * This should be called on application startup
 */
export function validateSecrets() {
  const secrets = {
    JWT_SECRET: process.env.JWT_SECRET,
    MONGODB_URI: process.env.MONGODB_URI,
  };

  const errors: string[] = [];

  // Check JWT_SECRET
  if (!secrets.JWT_SECRET) {
    errors.push('JWT_SECRET is not set');
  } else if (secrets.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  } else if (secrets.JWT_SECRET.includes('password') || secrets.JWT_SECRET.includes('123')) {
    errors.push('JWT_SECRET looks weak - use a cryptographically random string');
  }

  // Check MONGODB_URI
  if (!secrets.MONGODB_URI) {
    errors.push('MONGODB_URI is not set');
  } else if (!secrets.MONGODB_URI.includes('mongodb')) {
    errors.push('MONGODB_URI does not look like a valid MongoDB connection string');
  }

  // Check optional secrets for production
  if (process.env.NODE_ENV === 'production') {
    const optionalSecrets = {
      'Sentry DSN': process.env.NEXT_PUBLIC_SENTRY_DSN,
      'Encryption key': process.env.ENCRYPTION_KEY,
      'Omise secret key (merchant subscription billing)': process.env.OMISE_SECRET_KEY,
      'Omise public key (merchant subscription billing)': process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY,
      'Cron secret (billing/trial/purge/inactivity crons)': process.env.CRON_SECRET,
      'Shopenter LINE channel token (inactivity-deletion notices)': process.env.SHOPENTER_LINE_CHANNEL_ACCESS_TOKEN,
    };

    Object.entries(optionalSecrets).forEach(([name, value]) => {
      if (!value) {
        console.warn(`⚠️ Warning: ${name} is not set in production`);
      }
    });
  }

  // If there are critical errors, throw immediately
  if (errors.length > 0) {
    console.error('❌ CRITICAL: Environment validation failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error('Environment validation failed. See logs above.');
  }

  console.log('✅ All environment secrets validated');
}

/**
 * Check if a secret looks properly random
 */
function looksRandom(str: string): boolean {
  // Check for randomness by looking at character distribution
  const upper = (str.match(/[A-Z]/g) || []).length;
  const lower = (str.match(/[a-z]/g) || []).length;
  const digits = (str.match(/[0-9]/g) || []).length;
  const special = (str.match(/[^A-Za-z0-9]/g) || []).length;

  // A random string should have mix of character types
  const hasMultipleTypes = [upper, lower, digits, special].filter(x => x > 0).length >= 2;

  return hasMultipleTypes && str.length >= 32;
}
