import { Injectable, NotFoundException } from '@nestjs/common';
import { CityInterestsService } from 'src/modules/city-interests/city-interests.service';
import { CityVisitsService } from 'src/modules/city-visits/city-visits.service';
import { CountryImageDto } from 'src/modules/countries/dtos/country-image.dto';
import { CountryPageDto } from 'src/modules/countries/dtos/country-page.dto';
import { CountryRankingDto } from 'src/modules/countries/dtos/country-ranking.dto';
import { CountryRatingRankingDto } from 'src/modules/countries/dtos/country-rating-ranking.dto';
import { CountrySearchDto } from 'src/modules/countries/dtos/country-search.dto';
import { CountryVisitRankingDto } from 'src/modules/countries/dtos/country-visit-ranking.dto';
import { CountryEntity } from 'src/modules/countries/entities/country.entity';
import { MediaEntity } from 'src/modules/media/entities/media.entity';
import { UsersService } from 'src/modules/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CountriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cityVisitsService: CityVisitsService,
    private readonly cityInterestsService: CityInterestsService,
    private readonly usersService: UsersService,
  ) {}

  findMany(): Promise<CountryEntity[]> {
    return this.prisma.country.findMany();
  }

  async findByIso2(iso2: string): Promise<CountryPageDto> {
    const country = await this.prisma.country.findUnique({
      where: { iso2 },
    });

    if (!country) {
      throw new NotFoundException();
    }

    const averageRating =
      await this.cityVisitsService.getCountryAverageRatingByIso2(country.iso2);

    const visitsCount =
      await this.cityVisitsService.getCountryVisitsCountByIso2(country.iso2);

    const interestsCount =
      await this.cityInterestsService.getCountryInterestsCountByIso2(
        country.iso2,
      );

    const residentsCount = await this.usersService.getResidentsCountByIso2(
      country.iso2,
    );

    const reviewsCount =
      await this.cityVisitsService.getCountryReviewsCountByIso2(country.iso2);

    const positionInRatingRanking =
      (await this.ratingRanking({ count: 20 })).findIndex(
        (value) => value.iso2 === country.iso2,
      ) + 1;

    const positionInVisitRanking =
      (await this.visitRanking({ count: 20 })).findIndex(
        (value) => value.iso2 === country.iso2,
      ) + 1;

    return {
      ...country,
      averageRating,
      visitsCount,
      interestsCount,
      residentsCount,
      reviewsCount,
      positionInRatingRanking: positionInRatingRanking || null,
      positionInVisitRanking: positionInVisitRanking || null,
    };
  }

  async search(query: CountrySearchDto): Promise<CountryEntity[]> {
    return await this.prisma.$queryRaw<CountryEntity[]>`
      DECLARE @page INT = ${query.page || 1};
      DECLARE @count INT = ${query.count || 10};

      SELECT *
      FROM [dbo].[Country] as c
      WHERE CONTAINS(name, ${'"' + query.q + '*"'})
      ORDER BY c.id DESC
      OFFSET @count * (@page - 1) ROWS
      FETCH NEXT @count ROWS ONLY
    `;
  }

  async getCountryImages(
    iso2: string,
    page = 1,
    count = 10,
  ): Promise<CountryImageDto[]> {
    const images = await this.prisma.$queryRaw<
      (MediaEntity & {
        userId: number;
        cityName: string;
        cityId: number;
        cityRegionId: number;
        cityLatitude: number;
        cityLongitude: number;
        type: 'diary-post' | 'tip';
        postId: number;
        message: string;
      })[]
    >`
      DECLARE @page INT = ${page};
      DECLARE @count INT = ${count};

      (SELECT m.id, m.url, m.createdAt, td.userId, dp.message, dp.id as postId, c.id as cityId, c.name as cityName, c.regionId as cityRegionId, c.latitude as cityLatitude, c.longitude as cityLongitude, 'diary-post' as type
      FROM [dbo].[DiaryPostMedia] m
      JOIN [dbo].[DiaryPost] dp ON dp.id = m.diaryPostId
      JOIN [dbo].[TripDiary] td ON td.id = dp.tripDiaryId
      JOIN [dbo].[City] c ON td.cityId = c.id
      JOIN [dbo].[Region] r ON c.regionId = r.id
      JOIN [dbo].[Country] co ON r.countryId = co.id
      WHERE co.iso2 = ${iso2})
      UNION ALL
      (SELECT m.id, m.url, m.createdAt, t.userId, t.message, t.id as postId, c.id as cityId, c.name as cityName, c.regionId as cityRegionId, c.latitude as cityLatitude, c.longitude as cityLongitude, 'tip' as type
      FROM [dbo].[TipMedia] m
      JOIN [dbo].[Tip] t ON t.id = m.tipId
      JOIN [dbo].[City] c ON t.cityId = c.id
      JOIN [dbo].[Region] r ON c.regionId = r.id
      JOIN [dbo].[Country] co ON r.countryId = co.id
      WHERE co.iso2 = ${iso2})
      ORDER BY createdAt DESC
      OFFSET @count * (@page - 1) ROWS
      FETCH NEXT @count ROWS ONLY
    `;

    return await Promise.all(
      images.map(async (image) => {
        const user = await this.usersService.findById(image.userId);

        return {
          id: image.id,
          createdAt: image.createdAt,
          url: image.url,
          userId: image.userId,
          user,
          message: image.message,
          postId: image.postId,
          type: image.type,
          city: {
            id: image.cityId,
            name: image.cityName,
            regionId: image.cityRegionId,
            latitude: image.cityLatitude,
            longitude: image.cityLongitude,
          },
        };
      }),
    );
  }

  async visitRanking({
    page = 1,
    count = 10,
    date,
    continent,
  }: CountryRankingDto): Promise<CountryVisitRankingDto[]> {
    return await this.prisma.$queryRaw<CountryVisitRankingDto[]>`
      DECLARE @page INT = ${page};
      DECLARE @date INT = ${date || null};
      DECLARE @continent INT = ${continent || null};
      DECLARE @count INT = ${count};

      SELECT c.name, c.iso2,
        COUNT(cv.userId) AS totalVisit
      FROM [dbo].[Country] c
      JOIN [dbo].[Region] r ON c.id = r.countryId
      JOIN [dbo].[City] ct ON r.id = ct.regionId
      JOIN [dbo].[CityVisit] cv ON ct.id = cv.cityId
      WHERE (DATEDIFF(DAY, cv.createdAt, GETDATE()) <= @date OR @date IS NULL)
      AND (c.continentId = @continent OR @continent is NULL)
      GROUP BY c.name, c.iso2
      ORDER BY totalVisit DESC
      OFFSET @count * (@page - 1) ROWS
      FETCH NEXT @count ROWS ONLY
    `;
  }

  async ratingRanking({
    page = 1,
    count = 10,
    date,
    continent,
  }: CountryRankingDto): Promise<CountryRatingRankingDto[]> {
    return await this.prisma.$queryRaw<CountryRatingRankingDto[]>`
      DECLARE @page INT = ${page};
      DECLARE @date INT = ${date || null};
      DECLARE @continent INT = ${continent || null};
      DECLARE @count INT = ${count};

      SELECT c.name, c.iso2, ROUND(AVG(CAST(cv.rating AS FLOAT)), 1) AS averageRating
      FROM [dbo].[Country] c
      JOIN [dbo].[Region] r ON c.id = r.countryId
      JOIN [dbo].[City] ct ON r.id = ct.regionId
      JOIN [dbo].[CityVisit] cv ON ct.id = cv.cityId
      WHERE (DATEDIFF(DAY, cv.createdAt, GETDATE()) <= @date OR @date IS NULL)
      AND (c.continentId = @continent OR @continent is NULL)
      GROUP BY c.name, c.iso2
      HAVING ROUND(AVG(CAST(cv.rating AS FLOAT)), 1) IS NOT NULL
      ORDER BY averageRating DESC
      OFFSET @count * (@page - 1) ROWS
      FETCH NEXT @count ROWS ONLY
    `;
  }
}
