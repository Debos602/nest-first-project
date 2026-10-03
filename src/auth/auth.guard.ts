import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from 'node_modules/@nestjs/jwt/dist/jwt.service';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private readonly jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return validateRequest(request);
  }
}