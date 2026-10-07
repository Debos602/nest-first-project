import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { NoteModule } from './note/note.module';
import { PostModule } from './post/post.module';
import { RelationModule } from './relation/relation.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    UserModule,
    NoteModule,
    PostModule,
    RelationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
