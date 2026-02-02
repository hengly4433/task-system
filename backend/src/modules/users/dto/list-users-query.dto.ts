import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/pagination';

export class ListUsersQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by username or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Include soft-deleted users', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean = false;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['username', 'email', 'createdAt'] })
  @IsOptional()
  @IsIn(['username', 'email', 'createdAt'])
  override sortBy?: string = 'createdAt';
}
