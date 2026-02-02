import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination';

export class ListTaskStatusesQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  projectId?: string;  // Filter by project

  @IsOptional()
  @IsString()
  departmentId?: string; // Filter by department

  @IsOptional()
  @IsString()
  search?: string;
}
