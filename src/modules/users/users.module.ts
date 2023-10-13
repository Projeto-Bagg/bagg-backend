import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersRepository } from './users-repository';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [PrismaModule, JwtModule, MediaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: UsersRepository, useClass: UsersService },
  ],
  exports: [UsersService],
})
export class UsersModule {}
