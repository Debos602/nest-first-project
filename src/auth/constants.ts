export const jwtConstants = {
  accessTokenLifetimeSeconds: 10 * 60,
  refreshTokenLifetimeSeconds: 7 * 24 * 60 * 60,
  refreshTokenLifetimeMs: 7 * 24 * 60 * 60 * 1000,
};

export function getRequiredJwtSecret(
  name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET',
): string {
  const secret = process.env[name];
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error(`${name} must be configured with at least 32 bytes`);
  }
  return secret;
}
