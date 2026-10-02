import { Injectable } from '@nestjs/common';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { PrismaService } from 'src/prisma.service';


@Injectable()
export class UserService {
    constructor(private readonly prismaService: PrismaService) {}
   async  getUserByEmail(email: string) {
       return  await this.prismaService.user.findFirst({
            where: {
                email
            }
        });    
    }
   async createUser(registerDto: RegisterDto) {
       return this.prismaService.user.create({
           data:registerDto,
       });
   }
}
