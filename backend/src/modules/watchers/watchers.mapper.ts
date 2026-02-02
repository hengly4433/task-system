import { WatcherResponseDto } from './dto';

export class WatchersMapper {
  static toResponse(watcher: any): WatcherResponseDto {
    return {
      watcherId: watcher.watcherId.toString(),
      taskId: watcher.taskId.toString(),
      userId: watcher.userId.toString(),
      createdAt: watcher.createdAt.toISOString(),
      user: watcher.user
        ? {
            userId: watcher.user.userId.toString(),
            fullName: watcher.user.fullName,
            profileImageUrl: watcher.user.profileImageUrl,
          }
        : undefined,
    };
  }

  static toResponseList(watchers: any[]): WatcherResponseDto[] {
    return watchers.map((w) => this.toResponse(w));
  }
}
