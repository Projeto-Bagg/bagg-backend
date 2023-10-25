import { ApiProperty } from '@nestjs/swagger';
import { DiaryPost } from '@prisma/client';
import { DiaryPostMediaEntity } from 'src/modules/diary-post-medias/entities/diary-post-media.entity';
import { TripDiaryEntity } from 'src/modules/trip-diaries/entities/trip-diary.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';

export class DiaryPostEntity implements DiaryPost {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string | null;

  @ApiProperty()
  message: string | null;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  user: UserEntity;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  tripDiaryId: number;

  @ApiProperty()
  tripDiary: TripDiaryEntity;

  @ApiProperty()
  likedBy: number;

  @ApiProperty()
  isLiked: boolean;

  @ApiProperty({ type: DiaryPostMediaEntity, isArray: true })
  diaryPostMedias: DiaryPostMediaEntity[];
}
