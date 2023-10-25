import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional()
  image?: string | null;

  @ApiPropertyOptional()
  bio?: string | undefined;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  profilePic?: Express.Multer.File;
}
