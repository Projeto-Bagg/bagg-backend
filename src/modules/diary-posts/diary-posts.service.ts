import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateDiaryPostDto } from './dtos/create-diary-post.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserFromJwt } from 'src/modules/auth/models/UserFromJwt';
import { MediaService } from 'src/modules/media/media.service';
import { UserClientDto } from 'src/modules/users/dtos/user-client.dto';
import { FollowsService } from 'src/modules/follows/follows.service';
import { CreateDiaryPostReportDto } from 'src/modules/diary-posts/dtos/create-diary-post-report.dto';
import { DiaryPostClientDto } from 'src/modules/diary-posts/dtos/diary-post-client.dto';

@Injectable()
export class DiaryPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly followsService: FollowsService,
  ) {}

  async create(
    createDiaryPostDto: CreateDiaryPostDto,
    medias: Express.Multer.File[],
    currentUser: UserFromJwt,
  ): Promise<DiaryPostClientDto> {
    const diaryPost = await this.prisma.diaryPost.create({
      data: {
        message: createDiaryPostDto.message,
        tripDiary: {
          connect: {
            id: Number(createDiaryPostDto.tripDiaryId),
          },
        },
        user: {
          connect: {
            id: currentUser.id,
          },
        },
      },
      include: {
        user: true,
        tripDiary: true,
      },
    });

    const diaryPostMedias = await Promise.all(
      medias.map(async (media) => {
        const url = await this.mediaService.uploadFile(media, 'diary-posts');
        return await this.prisma.diaryPostMedia.create({
          data: {
            url,
            diaryPost: {
              connect: {
                id: diaryPost.id,
              },
            },
          },
        });
      }),
    );

    return {
      ...diaryPost,
      likedBy: [],
      diaryPostMedias,
      isLiked: false,
      likesAmount: 0,
    };
  }

  async findById(
    id: number,
    currentUser?: UserFromJwt,
  ): Promise<DiaryPostClientDto> {
    const post = await this.prisma.diaryPost.findUnique({
      where: {
        id,
        status: 'active',
        softDelete: false,
      },
      include: {
        diaryPostMedias: true,
        likedBy: true,
        tripDiary: true,
        user: true,
      },
    });

    if (!post) {
      throw new NotFoundException();
    }

    return {
      ...post,
      isLiked: post.likedBy.some((like) => like.userId === currentUser?.id),
      likesAmount: post.likedBy.length,
    };
  }

  async likedBy(
    id: number,
    currentUser?: UserFromJwt,
  ): Promise<UserClientDto[]> {
    const users = await this.prisma.user.findMany({
      where: {
        diaryPostLikes: {
          some: {
            diaryPostId: id,
          },
        },
      },
    });

    return await Promise.all(
      users.map(async (user) => {
        return {
          ...user,
          friendshipStatus: await this.followsService.friendshipStatus(
            user.id,
            currentUser,
          ),
        };
      }),
    );
  }

  async findByUsername(
    username: string,
    page = 1,
    count = 10,
    currentUser?: UserFromJwt,
  ): Promise<DiaryPostClientDto[]> {
    const posts = await this.prisma.diaryPost.findMany({
      where: {
        user: {
          username,
        },
        softDelete: false,
        status: 'active',
      },
      skip: count * (page - 1),
      take: count,
      include: {
        user: true,
        diaryPostMedias: true,
        tripDiary: true,
        likedBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts.map((post) => {
      return {
        ...post,
        isLiked: post.likedBy.some((like) => like.userId === currentUser?.id),
        likesAmount: post.likedBy.length,
      };
    });
  }

  async report(
    id: number,
    createDiaryPostReportDto: CreateDiaryPostReportDto,
    currentUser: UserFromJwt,
  ): Promise<void> {
    await this.prisma.diaryPostReport.create({
      data: {
        reason: createDiaryPostReportDto.reason,
        diaryPost: {
          connect: {
            id,
          },
        },
        user: {
          connect: {
            id: currentUser.id,
          },
        },
      },
    });

    const minReportsLength = 7;

    const reportsLength = await this.prisma.diaryPostReport.count({
      where: { AND: [{ diaryPostId: id }, { reviewed: false }] },
    });

    if (reportsLength <= minReportsLength) {
      return;
    }

    const diaryPost = await this.prisma.diaryPost.findUnique({
      where: {
        id,
        status: 'active',
        softDelete: false,
      },
      include: {
        user: {
          include: {
            followers: true,
          },
        },
        likedBy: true,
      },
    });

    if (!diaryPost) {
      return;
    }

    const interactions =
      diaryPost.likedBy.length + diaryPost.user.followers.length;

    if (
      Math.ceil(
        (Math.log2(interactions) / 100) * 0.1 * interactions + minReportsLength,
      ) >= reportsLength
    ) {
      await this.prisma.diaryPost.update({
        where: { id },
        data: {
          status: 'in-review',
        },
      });
    }
  }

  async delete(id: number, currentUser: UserFromJwt): Promise<void> {
    const post = await this.prisma.diaryPost.findUnique({
      where: {
        id,
      },
      include: {
        diaryPostMedias: true,
      },
    });

    if (!post) {
      throw new NotFoundException();
    }

    if (post.userId !== currentUser.id) {
      throw new UnauthorizedException();
    }

    // if (post.diaryPostMedias && post.diaryPostMedias.length > 0) {
    //   post.diaryPostMedias.forEach(async (media) => {
    //     const fileName = media.url.split('/').pop();

    //     if (!fileName) {
    //       return;
    //     }

    //     await this.mediaService.deleteFile(fileName, 'diary-posts');
    //   });
    // }

    await this.prisma.diaryPost.update({
      data: {
        softDelete: true,
      },
      where: {
        id,
      },
    });
  }
}
