import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma.service';
import { getRequiredJwtSecret, jwtConstants } from './constants';
import { hashRefreshToken } from './cookie-security';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshPayload {
  email: string;
  jti: string;
  sub: number;
  tokenType: 'refresh';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async register(registerDto: RegisterDto): Promise<TokenPair> {
    const user = await this.userService.getUserByEmail(registerDto.email);

    if (user) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const newUser = await this.userService.createUser({
      ...registerDto,
      password: hashedPassword,
    });

    this.logger.log(`User registered with email: ${newUser.email}`);
    return this.createSession(newUser.id, newUser.email);
  }

  async login(loginDto: LoginDto): Promise<TokenPair> {
    const user = await this.userService.getUserByEmail(loginDto.email);
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('email or password is incorrect');
    }

    return this.createSession(user.id, user.email);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!storedToken || storedToken.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const now = new Date();
    if (storedToken.revokedAt || storedToken.expiresAt <= now) {
      await this.revokeTokenFamily(storedToken.familyId);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.createTokenPair(
      storedToken.user.id,
      storedToken.user.email,
    );
    const replacementHash = hashRefreshToken(tokens.refreshToken);
    const rotation = await this.prismaService.$transaction(
      async (transaction) => {
        const result = await transaction.refreshToken.updateMany({
          where: {
            id: storedToken.id,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { revokedAt: now },
        });

        if (result.count !== 1) {
          await transaction.refreshToken.updateMany({
            where: { familyId: storedToken.familyId, revokedAt: null },
            data: { revokedAt: now },
          });
          return false;
        }

        await transaction.refreshToken.create({
          data: {
            tokenHash: replacementHash,
            familyId: storedToken.familyId,
            userId: storedToken.userId,
            expiresAt: new Date(
              now.getTime() + jwtConstants.refreshTokenLifetimeMs,
            ),
          },
        });
        return true;
      },
    );

    if (!rotation) {
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    return tokens;
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    const storedToken = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken) },
      select: { familyId: true },
    });
    if (storedToken) {
      await this.revokeTokenFamily(storedToken.familyId);
    }
  }

  private async createSession(
    userId: number,
    email: string,
  ): Promise<TokenPair> {
    const tokens = await this.createTokenPair(userId, email);
    await this.prismaService.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(tokens.refreshToken),
        familyId: randomUUID(),
        userId,
        expiresAt: new Date(Date.now() + jwtConstants.refreshTokenLifetimeMs),
      },
    });
    return tokens;
  }

  private async createTokenPair(
    userId: number,
    email: string,
  ): Promise<TokenPair> {
    const payload = { email, sub: userId };
    const accessToken = await this.jwtService.signAsync(
      { ...payload, jti: randomUUID(), tokenType: 'access' },
      { expiresIn: jwtConstants.accessTokenLifetimeSeconds },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, jti: randomUUID(), tokenType: 'refresh' },
      {
        secret: this.getRefreshSecret(),
        expiresIn: jwtConstants.refreshTokenLifetimeSeconds,
      },
    );
    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<RefreshPayload> {
    const secret = this.getRefreshSecret();
    try {
      const payload = await this.jwtService.verifyAsync<RefreshPayload>(token, {
        secret,
      });
      if (
        payload.tokenType !== 'refresh' ||
        typeof payload.jti !== 'string' ||
        !Number.isInteger(payload.sub) ||
        typeof payload.email !== 'string'
      ) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prismaService.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private getRefreshSecret(): string {
    return getRequiredJwtSecret('JWT_REFRESH_SECRET');
  }
}
