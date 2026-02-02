import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDependencyDto {
  @ApiProperty({ description: 'ID of the task that this task depends on' })
  @IsString()
  dependentTaskId: string;
}

export class DependencyResponseDto {
  @ApiProperty() dependencyId: string;
  @ApiProperty() taskId: string;
  @ApiProperty() dependentTaskId: string;
}
