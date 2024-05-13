import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCityVisitDto } from './dtos/create-city-visit.dto';
import { UserFromJwt } from 'src/modules/auth/models/UserFromJwt';
import { CityInterestsService } from 'src/modules/city-interests/city-interests.service';
import { CityVisitEntity } from 'src/modules/city-visits/entities/city-visit.entity';
import { CityVisitClientDto } from 'src/modules/city-visits/dtos/city-visit-client.dto';
import { UpdateCityVisitDto } from 'src/modules/city-visits/dtos/update-city-visit.dto';
import { UserCityVisitDto } from 'src/modules/city-visits/dtos/user-city-visit.dto';
import { CountryCityVisitDto } from 'src/modules/city-visits/dtos/country-city-visit.dto';

@Injectable()
export class CityVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cityInterestService: CityInterestsService,
  ) {}

  async create(
    createCityVisitDto: CreateCityVisitDto,
    currentUser: UserFromJwt,
  ): Promise<CityVisitClientDto> {
    const isUserInterestedInCity =
      await this.cityInterestService.isUserInterestedInCity(
        createCityVisitDto.cityId,
        currentUser.id,
      );

    if (isUserInterestedInCity) {
      await this.cityInterestService.remove(
        createCityVisitDto.cityId,
        currentUser,
      );
    }

    const cityVisit = await this.prisma.cityVisit.create({
      data: {
        ...createCityVisitDto,
        userId: currentUser.id,
      },
      include: {
        user: {
          include: {
            account: true,
          },
        },
      },
    });

    return {
      ...cityVisit,
      user: {
        ...cityVisit.user,
        ...cityVisit.user.account,
      },
    };
  }

  async update(
    updateCityVisitDto: UpdateCityVisitDto,
    currentUser: UserFromJwt,
  ): Promise<CityVisitClientDto> {
    const cityVisit = await this.prisma.cityVisit.update({
      where: {
        userId_cityId: {
          cityId: updateCityVisitDto.cityId,
          userId: currentUser.id,
        },
      },
      data: {
        message: updateCityVisitDto.message,
        rating: updateCityVisitDto.rating,
      },
      include: {
        user: {
          include: {
            account: true,
          },
        },
      },
    });

    return {
      ...cityVisit,
      user: {
        ...cityVisit.user,
        ...cityVisit.user.account,
      },
    };
  }

  async getUserVisitByCityId(
    cityId: number,
    userId: number,
  ): Promise<CityVisitEntity | null> {
    return await this.prisma.cityVisit.findUnique({
      where: {
        userId_cityId: {
          cityId,
          userId,
        },
      },
    });
  }

  async getAverageRatingByCityId(cityId: number): Promise<number | null> {
    const response = await this.prisma.cityVisit.aggregate({
      _avg: {
        rating: true,
      },
      where: {
        cityId,
      },
    });

    return response._avg.rating ? +response._avg.rating.toFixed(1) : null;
  }

  async getCountryAverageRatingByIso2(iso2: string): Promise<number | null> {
    const response = await this.prisma.cityVisit.aggregate({
      _avg: {
        rating: true,
      },
      where: {
        city: {
          region: {
            country: {
              iso2,
            },
          },
        },
      },
    });

    return response._avg.rating ? +response._avg.rating.toFixed(1) : null;
  }

  async getVisitsCountByCityId(cityId: number): Promise<number> {
    return await this.prisma.cityVisit.count({
      where: {
        cityId,
      },
    });
  }

  async getCountryVisitsCountByIso2(iso2: string): Promise<number> {
    return await this.prisma.cityVisit.count({
      where: {
        city: {
          region: {
            country: {
              iso2,
            },
          },
        },
      },
    });
  }
  async getReviewsCountByCityId(cityId: number): Promise<number> {
    return await this.prisma.cityVisit.count({
      where: {
        cityId,
        NOT: {
          rating: null,
        },
      },
    });
  }

  async getCountryReviewsCountByIso2(iso2: string): Promise<number> {
    return await this.prisma.cityVisit.count({
      where: {
        city: {
          region: {
            country: {
              iso2,
            },
          },
        },
        NOT: {
          rating: null,
        },
      },
    });
  }

  async getVisitsByCityId(
    cityId: number,
    page = 1,
    count = 5,
  ): Promise<CityVisitClientDto[]> {
    const cityVisits = await this.prisma.cityVisit.findMany({
      take: count,
      skip: (page - 1) * count,
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        cityId,
        NOT: [{ message: null }],
      },
      include: {
        user: {
          include: {
            account: true,
          },
        },
      },
    });

    return cityVisits.map((cityVisit) => {
      return {
        ...cityVisit,
        user: {
          ...cityVisit.user,
          ...cityVisit.user.account,
        },
      };
    });
  }

  async getVisitsByCountryIso2(
    countryIso2: string,
    page = 1,
    count = 5,
  ): Promise<CountryCityVisitDto[]> {
    const cityVisits = await this.prisma.cityVisit.findMany({
      take: count,
      skip: (page - 1) * count,
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        city: {
          region: {
            country: {
              iso2: countryIso2,
            },
          },
        },
        NOT: [{ message: null }],
      },
      include: {
        user: {
          include: {
            account: true,
          },
        },
        city: true,
      },
    });

    return cityVisits.map((cityVisit) => {
      return {
        ...cityVisit,
        user: {
          ...cityVisit.user,
          ...cityVisit.user.account,
        },
      };
    });
  }

  async getVisitsByUsername(username: string): Promise<UserCityVisitDto[]> {
    return await this.prisma.cityVisit.findMany({
      where: {
        user: {
          username,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        city: {
          include: {
            region: {
              include: {
                country: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(cityId: number, currentUser: UserFromJwt): Promise<void> {
    await this.prisma.cityVisit.delete({
      where: {
        userId_cityId: {
          cityId,
          userId: currentUser.id,
        },
      },
    });
  }
}
