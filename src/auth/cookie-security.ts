import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { jwtConstants } from './constants';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const CSRF_TOKEN_COOKIE = 'csrf_token';

export function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex < 0 || cookie.slice(0, separatorIndex).trim() !== name) {
      continue;
    }

    const value = cookie.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function assertCsrfToken(request: Request): void {
  const cookieToken = getCookie(request, CSRF_TOKEN_COOKIE);
  const headerToken = request.headers['x-csrf-token'];
  const cookieBytes = cookieToken ? Buffer.from(cookieToken) : undefined;
  const headerBytes =
    typeof headerToken === 'string' ? Buffer.from(headerToken) : undefined;

  if (
    !cookieBytes ||
    !headerBytes ||
    cookieBytes.length !== headerBytes.length ||
    !timingSafeEqual(cookieBytes, headerBytes)
  ) {
    throw new ForbiddenException('Missing or invalid CSRF token');
  }
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getSameSite(): 'lax' | 'strict' | 'none' {
  const sameSite = (process.env.COOKIE_SAME_SITE ?? 'lax').toLowerCase();
  if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') {
    return sameSite;
  }

  throw new InternalServerErrorException(
    'COOKIE_SAME_SITE must be lax, strict, or none',
  );
}

function getCookieOptions() {
  const sameSite = getSameSite();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: '/',
  } as const;
}

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string,
  refreshTokenLifetimeMs: number,
): void {
  const options = getCookieOptions();
  response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...options,
    maxAge: jwtConstants.accessTokenLifetimeSeconds * 1000,
  });
  response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...options,
    maxAge: refreshTokenLifetimeMs,
  });
}

export function clearAuthCookies(response: Response): void {
  const options = getCookieOptions();
  response.clearCookie(ACCESS_TOKEN_COOKIE, options);
  response.clearCookie(REFRESH_TOKEN_COOKIE, options);
}

export function setCsrfCookie(response: Response, token: string): void {
  const sameSite = getSameSite();
  response.cookie(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
