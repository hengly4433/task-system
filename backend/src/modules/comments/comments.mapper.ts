import { CommentResponseDto } from './dto';

type CommentModel = {
  commentId: bigint;
  taskId: bigint;
  userId: bigint;
  commentText: string;
  createdAt: Date;
  updatedAt: Date;
};

export class CommentsMapper {
  static toResponse(comment: CommentModel): CommentResponseDto {
    return {
      commentId: comment.commentId.toString(),
      taskId: comment.taskId.toString(),
      userId: comment.userId.toString(),
      commentText: comment.commentText,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: (comment as any).user
        ? {
            userId: (comment as any).user.userId.toString(),
            fullName: (comment as any).user.fullName || null,
            profileImageUrl: (comment as any).user.profileImageUrl || null,
          }
        : undefined,
    };
  }

  static toResponseList(comments: CommentModel[]): CommentResponseDto[] {
    return comments.map((c) => this.toResponse(c));
  }
}
