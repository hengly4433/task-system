import { IsString, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReminderDto {
  @ApiProperty() @IsString() @MaxLength(200) reminderText: string;
  @ApiProperty() @IsDateString() reminderTime: string;
}

export class ReminderResponseDto {
  @ApiProperty() reminderId: string;
  @ApiProperty() taskId: string;
  @ApiProperty() reminderText: string;
  @ApiProperty() reminderTime: string;
}
