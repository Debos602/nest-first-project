import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  assertCsrfToken,
  getCookie,
} from './cookie-security';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieToken = getCookie(request, ACCESS_TOKEN_COOKIE);
    const token = cookieToken ?? this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Token missing');
    }

    if (cookieToken && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      assertCsrfToken(request);
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        email: string;
        sub: number;
        tokenType?: string;
      }>(token);
      if (
        !Number.isInteger(payload.sub) ||
        (payload.tokenType !== undefined && payload.tokenType !== 'access')
      ) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      request['user'] = payload; // controller-এ req.user হিসেবে পাবে
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
