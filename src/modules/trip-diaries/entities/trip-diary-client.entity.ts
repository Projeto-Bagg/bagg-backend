import { ApiProperty } from '@nestjs/swagger';
import { CityRegionCountryDto } from 'src/modules/cities/dtos/city-region-country.dto';
import { TripDiaryEntity } from 'src/modules/trip-diaries/entities/trip-diary.entity';

export class TripDiaryClientEntity extends TripDiaryEntity {
  @ApiProperty({ type: CityRegionCountryDto })
  city: CityRegionCountryDto;
}
