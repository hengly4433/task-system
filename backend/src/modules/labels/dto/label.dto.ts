import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabelDto {
  @ApiProperty() @IsString() @MaxLength(80) labelName: string;
  @ApiProperty({ description: 'Hex color code, e.g. #FF5733' }) @IsString() @MaxLength(7) labelColor: string;
}

export class AssignLabelDto {
  @ApiProperty() @IsString() labelId: string;
}

export class LabelResponseDto {
  @ApiProperty() labelId: string;
  @ApiProperty() labelName: string;
  @ApiProperty() labelColor: string;
}
