import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertPreferenceDto {
  @ApiProperty() @IsString() @MaxLength(80) preferenceName: string;
  @ApiProperty() @IsString() @MaxLength(255) preferenceValue: string;
}

export class PreferenceResponseDto {
  @ApiProperty() preferenceId: string;
  @ApiProperty() preferenceName: string;
  @ApiProperty() preferenceValue: string;
}
