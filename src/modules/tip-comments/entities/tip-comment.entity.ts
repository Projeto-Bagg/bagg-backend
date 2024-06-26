import { ApiProperty } from '@nestjs/swagger';
import { TipComment } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { UserEntity } from 'src/modules/users/entities/user.entity';

export class TipCommentEntity implements TipComment {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  tipId: number;

  @ApiProperty()
  message: string;

  @ApiProperty()
  createdAt: Date;

  @Exclude()
  softDelete: boolean;

  @Exclude()
  status: string;

  @ApiProperty()
  user: UserEntity;
}
