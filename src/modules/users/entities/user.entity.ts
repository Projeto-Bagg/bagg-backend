import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserEntity implements User {
  @ApiProperty()
  id: number;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  username: string;

  @Exclude()
  email: string;

  @ApiPropertyOptional({ type: String })
  bio: string | null;

  @Exclude()
  emailVerified: boolean;

  @ApiProperty()
  birthdate: Date;

  @ApiProperty({ type: String })
  image: string | null;

  @Exclude()
  password: string;

  @ApiPropertyOptional({ type: Number })
  cityId: number | null;

  @ApiProperty()
  createdAt: Date;

  constructor(partial: UserEntity) {
    Object.assign(this, partial);
  }
}
