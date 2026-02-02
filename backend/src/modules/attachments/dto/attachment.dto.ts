import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttachmentDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @MaxLength(255) fileName: string;
  @ApiProperty({ maxLength: 1024 }) @IsString() @MaxLength(1024) filePath: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() fileSize?: number;
}

export class AttachmentResponseDto {
  @ApiProperty() attachmentId: string;
  @ApiProperty() taskId: string;
  @ApiProperty() fileName: string;
  @ApiProperty() filePath: string;
  @ApiPropertyOptional() mimeType: string | null;
  @ApiPropertyOptional() fileSize: string | null;
  @ApiPropertyOptional() uploadedBy: string | null;
  @ApiProperty() uploadedAt: string;
  @ApiPropertyOptional() publicUrl?: string;
}

