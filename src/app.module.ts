import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthService } from './modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { DiaryPostsModule } from './modules/diary-posts/diary-posts.module';
import { CityInterestsModule } from './modules/city-interests/city-interests.module';
import { CityVisitsModule } from './modules/city-visits/city-visits.module';
import { TipCommentsModule } from './modules/tip-comments/tip-comments.module';
import { CitiesModule } from './modules/cities/cities.module';
import { RegionsModule } from './modules/regions/regions.module';
import { CountriesModule } from './modules/countries/countries.module';
import { TipsModule } from './modules/tips/tips.module';
import { TipLikesModule } from './modules/tip-likes/tip-likes.module';
import { TipMediasModule } from './modules/tip-medias/tip-medias.module';
import { DiaryPostMediasModule } from './modules/diary-post-medias/diary-post-medias.module';
import { TripDiariesModule } from './modules/trip-diaries/trip-diaries.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DiaryPostsModule,
    DiaryPostMediasModule,
    TripDiariesModule,
    TipsModule,
    TipLikesModule,
    TipCommentsModule,
    TipMediasModule,
    CityInterestsModule,
    CityVisitsModule,
    CitiesModule,
    RegionsModule,
    CountriesModule,
    PrismaModule,
    MediaModule,

    ConfigModule.forRoot(),
  ],
  providers: [
    AuthService,
    JwtService,
    {
      provide: APP_GUARD,
      useFactory: (ref) => new JwtAuthGuard(ref),
      inject: [Reflector],
    },
  ],
})
export class AppModule {}
