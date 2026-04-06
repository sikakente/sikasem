/**
 * Railway injects all environment variables at container startup via the
 * Railway dashboard (Settings → Variables). No secrets manager is needed.
 *
 * This function validates that the required variables are present so the app
 * fails fast with a clear error rather than a cryptic runtime crash.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Set them in the Railway dashboard under Settings → Variables.',
    );
  }
}
