import { Injectable, NotFoundException } from '@nestjs/common';
import { UserFromJwt } from 'src/modules/auth/models/UserFromJwt';
import { CitySearchDto } from 'src/modules/cities/dtos/city-search.dto';
import { CityRatingRankingDto } from 'src/modules/cities/dtos/city-rating-ranking.dto';
import { CityVisitRankingDto } from 'src/modules/cities/dtos/city-visit-ranking.dto';
import { CityEntity } from 'src/modules/cities/entities/city.entity';
import { CityInterestsService } from 'src/modules/city-interests/city-interests.service';
import { CityVisitsService } from 'src/modules/city-visits/city-visits.service';
import { MediaEntity } from 'src/modules/media/entities/media.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { CitySearchResponseDto } from 'src/modules/cities/dtos/city-search-response';
import { CityPageDto } from 'src/modules/cities/dtos/city-page.dto';
import { UsersService } from 'src/modules/users/users.service';
import { CityImageDto } from 'src/modules/cities/dtos/city-image.dto';
import { CityRankingDto } from 'src/modules/cities/dtos/city-ranking.dto';
import { DistanceService } from '../distance/distance.service';
import { TrendingCities } from 'src/modules/cities/dtos/trending.dto';

@Injectable()
export class CitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cityInterestsService: CityInterestsService,
    private readonly cityVisitsService: CityVisitsService,
    private readonly usersService: UsersService,
    private readonly distanceService: DistanceService,
  ) {}

  findByCountry(countryIso2: string): Promise<CityEntity[]> {
    return this.prisma.city.findMany({
      where: {
        region: {
          country: {
            iso2: countryIso2,
          },
        },
      },
    });
  }

  async findById(id: number, currentUser?: UserFromJwt): Promise<CityPageDto> {
    const city = await this.prisma.city.findUnique({
      where: {
        id,
      },
      include: {
        region: {
          include: {
            country: true,
          },
        },
      },
    });

    if (!city) {
      throw new NotFoundException();
    }

    const averageRating = await this.cityVisitsService.getAverageRatingByCityId(
      city.id,
    );

    const visitsCount = await this.cityVisitsService.getVisitsCountByCityId(
      city.id,
    );

    const reviewsCount = await this.cityVisitsService.getReviewsCountByCityId(
      city.id,
    );

    const interestsCount =
      await this.cityInterestsService.getInterestsCountByCityId(city.id);

    const residentsCount = await this.usersService.getResidentsCountByCityId(
      city.id,
    );

    const isInterested = currentUser
      ? await this.cityInterestsService.isUserInterestedInCity(
          city.id,
          currentUser.id,
        )
      : false;

    const userVisit = currentUser
      ? await this.cityVisitsService.getUserVisitByCityId(
          city.id,
          currentUser.id,
        )
      : null;

    const positionInRatingRanking =
      (await this.ratingRanking({ count: 100 })).findIndex(
        (value) => value.id === city.id,
      ) + 1;

    const positionInVisitRanking =
      (await this.visitRanking({ count: 100 })).findIndex(
        (value) => value.id === city.id,
      ) + 1;

    return {
      ...city,
      isInterested,
      userVisit,
      averageRating,
      visitsCount,
      interestsCount,
      reviewsCount,
      residentsCount,
      positionInRatingRanking: positionInRatingRanking || null,
      positionInVisitRanking: positionInVisitRanking || null,
    };
  }

  async getCityImages(
    cityId: number,
    page = 1,
    count = 10,
  ): Promise<CityImageDto[]> {
    const images = await this.prisma.$queryRaw<
      (MediaEntity & {
        userId: number;
        type: 'tip' | 'diary-post';
        message: string;
        postId: number;
      })[]
    >`
      DECLARE @page INT = ${page};
      DECLARE @count INT = ${count};
      DECLARE @cityId INT = ${cityId}

      (SELECT m.id, m.url, m.createdAt, dp.message, dp.id as postId, td.userId, 'diary-post' as type
      FROM [dbo].[DiaryPostMedia] m
      JOIN [dbo].[DiaryPost] dp ON dp.id = m.diaryPostId
      JOIN [dbo].[TripDiary] td ON td.id = dp.tripDiaryId
      WHERE td.cityId = @cityId AND softDelete = 0 AND status = 'active')
      UNION ALL
      (SELECT m.id, m.url, m.createdAt, t.message, t.id as postId, t.userId, 'tip' as type
      FROM [dbo].[TipMedia] m
      JOIN [dbo].[Tip] t ON t.id = m.tipId
      WHERE t.cityId = @cityId AND softDelete = 0 AND status = 'active')
      ORDER BY createdAt DESC
      OFFSET @count * (@page - 1) ROWS
      FETCH NEXT @count ROWS ONLY
    `;

    return await Promise.all(
      images.map(async (image) => {
        const user = await this.usersService.findById(image.userId);

        return {
          ...image,
          user,
        };
      }),
    );
  }

  async search(query: CitySearchDto): Promise<CitySearchResponseDto[]> {
    return await this.prisma.$queryRaw<CitySearchResponseDto[]>`
      DECLARE @page INT = ${query.page || 1};
      DECLARE @count INT = ${query.count || 5};

      SELECT
          c.*,
          co.iso2,
          r.name as region,
          co.name as country,
          (SELECT COUNT(*) FROM [dbo].[CityInterest] WHERE cityId = c.id) AS totalInterest
      FROM 
          [dbo].[City] c
      JOIN 
          [dbo].[Region] r ON c.regionId = r.id
      JOIN 
          [dbo].[Country] co ON r.countryId = co.id
      WHERE CONTAINS(c.name, ${'"' + query.q + '*"'})
      ORDER BY totalInterest DESC, LEN(c.name) ASC
      OFFSET @count * (@page - 1) ROWS
      FETCH NEXT @count ROWS ONLY
    `;
  }

  async visitRanking({
    page = 1,
    count = 10,
    countryIso2,
    date,
  }: CityRankingDto): Promise<CityVisitRankingDto[]> {
    return await this.prisma.$queryRaw<CityVisitRankingDto[]>`
      DECLARE @page INT = ${page};
      DECLARE @count INT = ${count};
      DECLARE @date INT = ${date || null};
      DECLARE @countryIso2 VARCHAR(50) = ${countryIso2 || null};

      SELECT ci.*, r.name AS region, c.iso2, c.name AS country, COUNT(cv.id) AS totalVisit
      FROM [dbo].[City] ci
      JOIN [dbo].[Region] r ON ci.regionId = r.id
      JOIN [dbo].[Country] c ON c.id = r.countryId
      JOIN [dbo].[CityVisit] cv ON ci.id = cv.cityId
      WHERE (c.iso2 = @countryIso2 OR @countryIso2 is NULL)
      AND (DATEDIFF(DAY, cv.createdAt, GETDATE()) <= @date OR @date IS NULL)
      GROUP BY ci.name, ci.latitude, ci.longitude, ci.id, ci.regionId, r.name, c.iso2, c.name
      ORDER BY totalVisit DESC
      OFFSET @count * (@page - 1) ROWS
      FETCH NEXT @count ROWS ONLY
    `;
  }

  async ratingRanking({
    page = 1,
    count = 10,
    countryIso2,
    date,
  }: CityRankingDto) {
    return await this.prisma.$queryRaw<CityRatingRankingDto[]>`
      DECLARE @page INT = ${page};
      DECLARE @count INT = ${count};
      DECLARE @date INT = ${date || null};
      DECLARE @countryIso2 VARCHAR(50) = ${countryIso2 || null};

      SELECT ci.*, r.name AS region, c.iso2, c.name AS country, ROUND(AVG(CAST(cv.rating AS FLOAT)), 1) AS averageRating
      FROM [dbo].[City] ci
      JOIN [dbo].[Region] r ON ci.regionId = r.id
      JOIN [dbo].[Country] c ON c.id = r.countryId
      JOIN [dbo].[CityVisit] cv ON ci.id = cv.cityId
      WHERE (c.iso2 = @countryIso2 OR @countryIso2 IS NULL)
      AND (DATEDIFF(DAY, cv.createdAt, GETDATE()) <= @date OR @date IS NULL)
      GROUP BY ci.name, ci.latitude, ci.longitude, ci.id, ci.regionId, r.name, c.iso2, c.name
      HAVING ROUND(AVG(CAST(cv.rating AS FLOAT)), 1) IS NOT NULL
      ORDER BY averageRating DESC
      OFFSET @count * (@page - 1) ROWS
      FETCH NEXT @count ROWS ONLY
    `;
  }

  async recommendCities(
    currentUser: UserFromJwt,
    page = 1,
    count = 40,
  ): Promise<CityEntity[]> {
    const NEARBY_TRENDING_RATIO = 0.8;
    const MAX_NEARBY_CITIES = count * NEARBY_TRENDING_RATIO;
    const MAX_TRENDING_CITIES = count - MAX_NEARBY_CITIES;

    const cities = (
      await this.prisma.user.findUnique({
        where: { id: currentUser.id },
        include: {
          cityInterests: {
            include: { city: true },
            take: MAX_NEARBY_CITIES,
            skip: count * (page - 1),
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })
    )?.cityInterests.map((cityInterest) => cityInterest.city);

    const closestCitiesToInterestedCities = (
      await Promise.all(
        Array.from(
          new Set(
            (
              await this.distanceService.getClosestCities(
                cities ? cities?.map((city) => city.id) : [],
                1,
                5,
              )
            ).map((closestCities) => closestCities.places),
          ),
        ),
      )
    ).flat();

    const trendingCities: CityEntity[] = [];

    if (
      closestCitiesToInterestedCities.length *
        NEARBY_TRENDING_RATIO *
        (cities?.length || 0) -
        count *
          closestCitiesToInterestedCities.length *
          NEARBY_TRENDING_RATIO !==
        0 ||
      closestCitiesToInterestedCities.length === 0
    ) {
      await this.trending(
        1,
        MAX_TRENDING_CITIES +
          (MAX_NEARBY_CITIES - closestCitiesToInterestedCities.length),
      ).then((response) =>
        response.cities.forEach((city) => trendingCities.push(city)),
      );
    }

    return (closestCitiesToInterestedCities as CityEntity[])
      .concat(trendingCities)
      .sort(() => Math.random() - 0.5);
  }

  async trending(page = 1, count = 10): Promise<TrendingCities> {
    const today = new Date();
    const thirtyDaysAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      today.getDate(),
    );

    const sixtyDaysAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 2,
      today.getDate(),
    );

    const interestsCount = await this.prisma.cityInterest.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
          lte: today,
        },
      },
    });

    const cityInterests = await this.prisma.cityInterest.groupBy({
      by: ['cityId'],
      take: count,
      skip: count * (page - 1),
      _count: {
        cityId: true,
      },
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
          lte: today,
        },
      },
      orderBy: {
        _count: {
          cityId: 'desc',
        },
      },
    });

    const cities = await this.prisma.city
      .findMany({
        where: {
          id: {
            in: cityInterests.map((interest) => interest.cityId),
          },
        },
        include: {
          region: {
            include: {
              country: true,
            },
          },
        },
      })
      .then((cities) =>
        cities.sort(
          (a, b) =>
            cityInterests.findIndex((interest) => interest.cityId === a.id) -
            cityInterests.findIndex((interest) => interest.cityId === b.id),
        ),
      );

    const cityInterests2MonthsAgo = await this.prisma.cityInterest.groupBy({
      by: ['cityId'],
      take: count,
      skip: count * (page - 1),
      _count: {
        cityId: true,
      },
      where: {
        cityId: {
          in: cityInterests.map((interest) => interest.cityId),
        },
        createdAt: {
          gte: sixtyDaysAgo,
          lte: thirtyDaysAgo,
        },
      },
      orderBy: {
        _count: {
          cityId: 'desc',
        },
      },
    });

    return {
      totalInterest: interestsCount,
      cities: cities.map((city, index) => {
        const interestCount2MonthsAgo = cityInterests2MonthsAgo.find(
          (interest) => interest.cityId === city.id,
        )?._count.cityId;

        const variation =
          cityInterests[index]._count.cityId - (interestCount2MonthsAgo || 0);

        return {
          ...city,
          interestsCount: cityInterests[index]._count.cityId,
          percentFromTotal: Number(
            (
              (cityInterests[index]._count.cityId / interestsCount) *
              100
            ).toFixed(1),
          ),
          variation: variation,
          variationPercentage: interestCount2MonthsAgo
            ? Number(((variation / interestCount2MonthsAgo) * 100).toFixed(1))
            : null,
        };
      }),
    };
  }
}
