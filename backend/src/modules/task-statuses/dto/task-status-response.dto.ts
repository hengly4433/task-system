export class TaskStatusResponseDto {
  statusId: string;
  projectId: string | null;  // Which project this status belongs to
  departmentId: string | null;  // Which department this status belongs to
  name: string;
  code: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  isTerminal: boolean;  // Marks completed/end states (e.g., Done, Cancelled)
  createdAt: string;
  updatedAt: string;
}
