import {
  Controller,
  Get,
  ClassSerializerInterceptor,
  UseInterceptors,
  Param,
  Post,
  Body,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsPublic } from 'src/modules/auth/decorators/is-public.decorator';
import { TipCommentsService } from './tip-comments.service';
import { TipCommentEntity } from './entities/tip-comment.entity';
import { CreateTipCommentDto } from './dtos/create-tip-comment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserFromJwt } from '../auth/models/UserFromJwt';
import { CreateTipCommentReportDto } from 'src/modules/tip-comments/dtos/create-tip-comment-report.dto';

@Controller('tip-comments')
@ApiTags('tip-comments')
export class TipCommentsController {
  constructor(private readonly tipCommentsService: TipCommentsService) {}

  @Get(':tipId')
  @UseInterceptors(ClassSerializerInterceptor)
  @IsPublic()
  @ApiResponse({ type: TipCommentEntity, isArray: true })
  async findByTip(@Param('tipId') tipId: number): Promise<TipCommentEntity[]> {
    return await this.tipCommentsService.findByTip(tipId);
  }

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({ type: TipCommentEntity })
  async create(
    @Body() createTipCommentDto: CreateTipCommentDto,
    @CurrentUser() currentUser: UserFromJwt,
  ): Promise<TipCommentEntity> {
    return await this.tipCommentsService.create(
      createTipCommentDto,
      currentUser,
    );
  }

  @Post('report/:id')
  @ApiResponse({ status: 201, description: 'Reported successfully' })
  @ApiBearerAuth()
  report(
    @Param('id') id: number,
    @Body() createTipCommentReport: CreateTipCommentReportDto,
    @CurrentUser() currentUser: UserFromJwt,
  ) {
    return this.tipCommentsService.report(
      id,
      createTipCommentReport,
      currentUser,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comment does not exist' })
  @ApiResponse({ status: 401, description: 'Comment was not created by you' })
  async delete(
    @Param('id') id: number,
    @CurrentUser() CurrentUser: UserFromJwt,
  ): Promise<void> {
    return this.tipCommentsService.delete(id, CurrentUser);
  }
}
