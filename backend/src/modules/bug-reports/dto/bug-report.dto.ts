import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBugReportDto {
  @ApiProperty() @IsString() bugDescription: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) priority?: string;
}

export class UpdateBugReportDto {
  @ApiPropertyOptional() @IsOptional() @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) priority?: string;
}

export class BugReportResponseDto {
  @ApiProperty() bugId: string;
  @ApiProperty() projectId: string;
  @ApiProperty() reportedBy: string;
  @ApiProperty() bugDescription: string;
  @ApiProperty() priority: string;
  @ApiProperty() status: string;
  @ApiProperty() reportedAt: string;
}
