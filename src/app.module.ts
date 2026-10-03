import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { NoteModule } from './note/note.module';


@Module({
  imports: [ConfigModule.forRoot(),AuthModule, UserModule, NoteModule ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
