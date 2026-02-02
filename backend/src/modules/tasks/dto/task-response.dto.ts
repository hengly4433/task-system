import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskResponseDto {
  @ApiProperty({ description: 'Task ID' })
  taskId: string;

  @ApiProperty({ description: 'Project ID' })
  projectId: string;

  @ApiPropertyOptional({ description: 'Parent task ID' })
  parentTaskId: string | null;

  @ApiProperty({ description: 'Task name' })
  taskName: string;

  @ApiPropertyOptional({ description: 'Description' })
  description: string | null;

  @ApiProperty({ description: 'Status' })
  status: string;

  @ApiProperty({ description: 'Priority' })
  priority: string;

  @ApiProperty({ description: 'Task Type' })
  taskType: string;

  @ApiPropertyOptional({ description: 'Estimated hours' })
  estimatedHours: number | null;

  @ApiPropertyOptional({ description: 'Remaining hours' })
  remainingHours: number | null;

  @ApiPropertyOptional({ description: 'Story points' })
  storyPoints: number | null;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  assignedTo: string | null;

  @ApiPropertyOptional({ description: 'Tester user ID' })
  testerId: string | null;

  @ApiPropertyOptional({ description: 'Due date' })
  dueDate: string | null;

  @ApiPropertyOptional({ description: 'Start date' })
  startDate: string | null;

  @ApiPropertyOptional({ description: 'Completed at date' })
  completedAt: string | null;

  @ApiPropertyOptional({ description: 'Sprint ID' })
  sprintId: string | null;

  // DETAILS section fields
  @ApiPropertyOptional({ description: 'Milestone details' })
  milestone?: { milestoneId: string; milestoneName: string } | null;

  @ApiPropertyOptional({ description: 'Milestone ID' })
  milestoneId?: string | null;

  @ApiPropertyOptional({ description: 'Team Name (Legacy)' })
  team: string | null;

  @ApiPropertyOptional({ description: 'Team ID (Relation)' })
  teamId: string | null;

  @ApiPropertyOptional({ description: 'Assigned Team Details' })
  assignedTeam?: {
    teamId: string;
    teamName: string;
  };

  @ApiPropertyOptional({ description: 'Module/Feature area' })
  module: string | null;

  @ApiPropertyOptional({ description: 'External link/reference' })
  externalLink: string | null;

  @ApiPropertyOptional({ description: 'Build/Release version' })
  buildVersion: string | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Assignee details' })
  assignee?: {
    userId: string;
    username: string;
    fullName: string | null;
    profileImageUrl: string | null;
  };

  @ApiPropertyOptional({ description: 'Tester details' })
  tester?: {
    userId: string;
    username: string;
    fullName: string | null;
    profileImageUrl: string | null;
  };

  @ApiPropertyOptional({ description: 'Creator details' })
  creator?: {
    userId: string;
    username: string;
    fullName: string | null;
    profileImageUrl: string | null;
  };

  @ApiPropertyOptional({ description: 'Parent task details' })
  parent?: {
    taskId: string;
    taskName: string;
  };

  @ApiPropertyOptional({ description: 'Project details' })
  project?: {
    projectId: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Sprint details' })
  sprint?: {
    sprintId: string;
    sprintName: string;
  };

  @ApiPropertyOptional({ description: 'Number of watchers' })
  watcherCount?: number;
}
