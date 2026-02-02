export type ActivityType =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_INVITED'
  | 'AVATAR_UPDATED'
  | 'PASSWORD_CHANGED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'PROJECT_MEMBER_ADDED'
  | 'PROJECT_MEMBER_REMOVED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'COMMENT_ADDED'
  | 'COMMENT_DELETED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_DELETED'
  | 'TIME_ENTRY_ADDED'
  | 'TIME_ENTRY_UPDATED'
  | 'BUG_REPORT_CREATED'
  | 'BUG_REPORT_UPDATED';

export interface LogActivityParams {
  userId: bigint;
  activityType: ActivityType;
  details?: string;
}

export interface LogTaskHistoryParams {
  taskId: bigint;
  changedBy: bigint;
  changeDescription: string;
}
