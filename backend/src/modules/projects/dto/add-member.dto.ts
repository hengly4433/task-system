import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add as member' })
  @Type(() => Number)
  @IsInt()
  userId: number;
}
