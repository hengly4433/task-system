import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for reordering statuses
 * Validates that statusIds is a non-empty array of strings
 */
export class ReorderStatusesDto {
  @ApiProperty({
    description: 'Array of status IDs in the desired order',
    example: ['1', '2', '3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one status ID is required' })
  statusIds: string[];
}
