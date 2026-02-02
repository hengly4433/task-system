
export class CreateMilestoneDto {
  projectId: string; // The project this milestone belongs to
  milestoneName: string;
  dueDate?: string; // ISO Date
}

export class UpdateMilestoneDto {
  milestoneName?: string;
  dueDate?: string; // ISO Date
}

export class MilestoneResponseDto {
  milestoneId: string;
  projectId: string;
  milestoneName: string;
  dueDate: string | null;
  createdAt: string;
}
