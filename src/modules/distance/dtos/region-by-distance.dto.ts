import { ApiProperty } from '@nestjs/swagger';
import { RegionEntity } from 'src/modules/regions/entities/region.entity';

export class RegionByDistanceDto extends RegionEntity {
  @ApiProperty({ type: Number })
  distance: number;

  constructor(partial: RegionByDistanceDto) {
    super();
    Object.assign(this, partial);
  }
}
