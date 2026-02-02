import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChecklistDto {
  @ApiProperty() @IsString() checklistName: string;
}

export class CreateChecklistItemDto {
  @ApiProperty() @IsString() itemName: string;
}

export class UpdateChecklistItemDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCompleted?: boolean;
}

export class ChecklistItemResponseDto {
  @ApiProperty() checklistItemId: string;
  @ApiProperty() itemName: string;
  @ApiProperty() isCompleted: boolean;
}

export class ChecklistResponseDto {
  @ApiProperty() checklistId: string;
  @ApiProperty() taskId: string;
  @ApiProperty() checklistName: string;
  @ApiProperty({ type: [ChecklistItemResponseDto] }) items: ChecklistItemResponseDto[];
}
