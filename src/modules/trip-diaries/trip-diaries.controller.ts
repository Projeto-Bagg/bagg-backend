import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { TripDiariesService } from './trip-diaries.service';
import { CreateTripDiaryDto } from './dtos/create-trip-diary.dto';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsPublic } from 'src/modules/auth/decorators/is-public.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { UserFromJwt } from 'src/modules/auth/models/UserFromJwt';
import { TripDiaryEntity } from 'src/modules/trip-diaries/entities/trip-diary.entity';
import { DiaryPostEntity } from 'src/modules/diary-posts/entities/diary-post.entity';
import { TripDiaryClientDto } from 'src/modules/trip-diaries/dtos/trip-diary-client.dto';
import { DiaryPostFeedDto } from 'src/modules/diary-posts/dtos/diary-post.feed.dto';

@Controller('trip-diaries')
@ApiTags('trip diaries')
export class TripDiariesController {
  constructor(private readonly tripDiariesService: TripDiariesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiResponse({ type: TripDiaryClientDto })
  create(
    @Body() createTripDiaryDto: CreateTripDiaryDto,
    @CurrentUser() currentUser: UserFromJwt,
  ): Promise<TripDiaryClientDto> {
    return this.tripDiariesService.create(createTripDiaryDto, currentUser);
  }

  @Get('user/:username')
  @ApiResponse({ type: TripDiaryClientDto, isArray: true })
  @UseInterceptors(ClassSerializerInterceptor)
  @IsPublic()
  async findByUsername(
    @Param('username') username: string,
  ): Promise<TripDiaryClientDto[]> {
    const tripDiaries = await this.tripDiariesService.findByUsername(username);

    return tripDiaries.map((tripDiary) => new TripDiaryClientDto(tripDiary));
  }

  @Get(':id/posts')
  @IsPublic()
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({ type: DiaryPostEntity, isArray: true })
  async findPostsById(
    @Param('id') id: number,
    @Query() query: DiaryPostFeedDto,
    @CurrentUser() currentUser: UserFromJwt,
  ): Promise<DiaryPostEntity[]> {
    const posts = await this.tripDiariesService.findPostsById(
      id,
      query.page,
      query.count,
      currentUser,
    );

    return posts.map((post) => new DiaryPostEntity(post));
  }

  @Get(':id')
  @IsPublic()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({ type: TripDiaryClientDto })
  async findOne(@Param('id') id: number): Promise<TripDiaryClientDto> {
    const tripDiary = await this.tripDiariesService.findOne(id);

    return new TripDiaryClientDto(tripDiary);
  }

  @Delete(':id')
  @ApiResponse({ type: TripDiaryEntity })
  @ApiBearerAuth()
  remove(
    @Param('id') id: number,
    @CurrentUser() currentUser: UserFromJwt,
  ): Promise<void> {
    return this.tripDiariesService.remove(+id, currentUser);
  }
}
