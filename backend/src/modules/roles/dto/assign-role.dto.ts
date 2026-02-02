import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID to assign the role to' })
  @Type(() => Number)
  @IsInt()
  userId: number;
}
