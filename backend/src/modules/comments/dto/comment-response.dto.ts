import { ApiProperty } from '@nestjs/swagger';

export class CommentResponseDto {
  @ApiProperty() commentId: string;
  @ApiProperty() taskId: string;
  @ApiProperty() userId: string;
  @ApiProperty() commentText: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
  @ApiProperty({ required: false })
  author?: {
    userId: string;
    fullName: string | null;
    profileImageUrl: string | null;
  };
}
