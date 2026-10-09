import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  assertCsrfToken,
  clearAuthCookies,
  getCookie,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
  setCsrfCookie,
} from './cookie-security';
import { jwtConstants } from './constants';
import { ApiCsrfHeader } from '../helper/api-csrf-header.decorator';
@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('csrf')
  csrf(@Res({ passthrough: true }) response: Response) {
    const csrfToken = randomBytes(32).toString('base64url');
    setCsrfCookie(response, csrfToken);
    return { csrfToken };
  }


  @Post('register')
  @ApiCsrfHeader()
  async register(
    @Body() registerDto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertCsrfToken(request);
    const tokens = await this.authService.register(registerDto);
    setAuthCookies(
      response,
      tokens.accessToken,
      tokens.refreshToken,
      jwtConstants.refreshTokenLifetimeMs,
    );
    return { message: 'Registration successful' };
  }

  @Post('login')
  @ApiCsrfHeader()
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertCsrfToken(request);
    const tokens = await this.authService.login(loginDto);
    setAuthCookies(
      response,
      tokens.accessToken,
      tokens.refreshToken,
      jwtConstants.refreshTokenLifetimeMs,
    );
    return { message: 'Login successful' };
  }

  @Post('refresh')
   @ApiCsrfHeader()
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertCsrfToken(request);
    const refreshToken = getCookie(request, REFRESH_TOKEN_COOKIE);
    if (!refreshToken) {
      clearAuthCookies(response);
      throw new UnauthorizedException('Refresh token cookie is missing');
    }

    const tokens = await this.authService.refresh(refreshToken);
    setAuthCookies(
      response,
      tokens.accessToken,
      tokens.refreshToken,
      jwtConstants.refreshTokenLifetimeMs,
    );
    return { message: 'Token refreshed' };
  }

  @Post('logout')
   @ApiCsrfHeader()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertCsrfToken(request);
    await this.authService.logout(getCookie(request, REFRESH_TOKEN_COOKIE));
    clearAuthCookies(response);
    return { message: 'Logged out' };
  }
}
