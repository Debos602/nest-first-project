import {
  Body,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}
  async register(registerDto: RegisterDto) {
    const user = await this.userService.getUserByEmail(registerDto.email);

    if (user) {
      throw new ConflictException('User with this email already exists');
    }

    const soltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, soltRounds);

    const newUser = await this.userService.createUser({
      ...registerDto,
      password: hashedPassword,
    });
    this.logger.log(`User registered with email: ${newUser.email}`);
    const payload = { email: newUser.email, sub: newUser.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  async Login(@Body() loginDto: LoginDto) {
    const user = await this.userService.getUserByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('email or password is incorrect');
    }
    const match = await bcrypt.compare(loginDto.password, user.password);
    if (!match) {
      throw new UnauthorizedException('email or password is incorrect');
    }
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
