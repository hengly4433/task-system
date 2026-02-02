import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBoardColumnDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) position?: number;
}

export class UpdateBoardColumnDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) position?: number;
}

export class MoveTaskDto {
  @ApiProperty() @IsString() status: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() position?: number;
}

export class BoardColumnResponseDto {
  @ApiProperty() columnId: string;
  @ApiProperty() name: string;
  @ApiProperty() position: number;
  @ApiProperty() taskCount: number;
}

export class BoardTaskResponseDto {
  @ApiProperty() taskId: string;
  @ApiProperty() taskName: string;
  @ApiProperty() status: string;
  @ApiProperty() priority: string;
  @ApiProperty() percentComplete: number;
  @ApiProperty({ nullable: true }) assigneeId: string | null;
  @ApiProperty({ nullable: true }) assigneeName: string | null;
}

export class BoardViewResponseDto {
  @ApiProperty() projectId: string;
  @ApiProperty() projectName: string;
  @ApiProperty({ type: [BoardColumnResponseDto] }) columns: BoardColumnResponseDto[];
  @ApiProperty({ description: 'Tasks grouped by status' }) tasks: Record<string, BoardTaskResponseDto[]>;
}
