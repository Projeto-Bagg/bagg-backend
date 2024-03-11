import {
  Controller,
  Post,
  Param,
  Delete,
  Get,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { CityInterestsService } from './city-interests.service';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { UserFromJwt } from 'src/modules/auth/models/UserFromJwt';
import { CityInterestEntity } from 'src/modules/city-interests/entities/city-interest.entity';

@Controller('cityInterests')
@ApiTags('city interests')
export class CityInterestsController {
  constructor(private readonly cityInterestsService: CityInterestsService) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBearerAuth()
  @ApiResponse({ type: CityInterestEntity, isArray: true })
  findAll() {
    return this.cityInterestsService.findMany();
  }

  @Post(':cityId')
  @ApiResponse({ type: CityInterestEntity })
  create(
    @Param('cityId') cityId: number,
    @CurrentUser() currentUser: UserFromJwt,
  ): Promise<CityInterestEntity> {
    return this.cityInterestsService.create(cityId, currentUser);
  }

  @Delete(':cityId')
  @ApiResponse({ type: CityInterestEntity })
  delete(
    @Param('cityId') cityId: number,
    @CurrentUser() currentUser: UserFromJwt,
  ): Promise<CityInterestEntity> {
    return this.cityInterestsService.remove(cityId, currentUser);
  }
}
