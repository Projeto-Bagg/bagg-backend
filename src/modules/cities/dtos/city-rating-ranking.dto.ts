import { ApiProperty } from '@nestjs/swagger';
import { CityEntity } from 'src/modules/cities/entities/city.entity';

export class CityRatingRankingDto extends CityEntity {
  @ApiProperty()
  iso2: string;

  @ApiProperty()
  region: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  averageRanking: number;
}
