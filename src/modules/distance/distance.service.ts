import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CityByDistanceDto } from './dtos/city-by-distance.dto';
import { City, Country, Region } from '@prisma/client';
import { RegionByDistanceDto } from './dtos/region-by-distance.dto';
import { CountryByDistanceDto } from './dtos/country-by-distance.dto';

interface CityDelegate {
  findMany(): Promise<City[]>;
}

interface RegionDelegate {
  findMany(): Promise<Region[]>;
}

interface CountryDelegate {
  findMany(): Promise<Country[]>;
}

interface Place {
  id: number;
  latitude: number;
  longitude: number;
}

@Injectable()
export class DistanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async getClosestPlaces(
    id: number,
    model: CityDelegate | RegionDelegate | CountryDelegate,
    count?: number,
    page?: number,
  ) {
    const allPlaces: Place[] = await model.findMany();
    const chosenPlace = allPlaces.find((place) => place.id == id);
    const nonChosenPlaces = allPlaces.filter((place) => place.id != id);
    if (chosenPlace) {
      const placesWithDistance = nonChosenPlaces.map((city) => ({
        ...city,
        distance: this.calculateDistance(
          city.latitude,
          city.longitude,
          chosenPlace?.latitude,
          chosenPlace?.longitude,
        ),
      }));
      const placesSortedByDistance = (
        placesWithDistance as
          | CityByDistanceDto[]
          | RegionByDistanceDto[]
          | CountryByDistanceDto[]
      ).sort((a, b) => a.distance - b.distance);
      return page && count
        ? placesSortedByDistance.slice(
            (page - 1) * count,
            (page - 1) * count + count,
          )
        : placesSortedByDistance;
    }
    return [];
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const earthRadiusKm = 6371;

    const degToRad = (degrees: number) => {
      return (degrees * Math.PI) / 180;
    };

    const dLat = degToRad(lat2 - lat1);
    const dLon = degToRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(degToRad(lat1)) *
        Math.cos(degToRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = earthRadiusKm * c;
    return distance;
  }

  async getClosestCities(id: number, count?: number, page?: number) {
    return this.getClosestPlaces(id, this.prisma.city, count, page);
  }

  async getClosestRegions(id: number, count?: number, page?: number) {
    return this.getClosestPlaces(id, this.prisma.region, count, page);
  }

  async getClosestCountries(id: number, count?: number, page?: number) {
    return this.getClosestPlaces(id, this.prisma.country, count, page);
  }
}
