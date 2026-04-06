const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Set these in the Railway dashboard under Settings → Variables.',
    );
  }
}
