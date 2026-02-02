import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectResponseDto {
  @ApiProperty({ description: 'Project ID' })
  projectId: string;

  @ApiProperty({ description: 'Project name' })
  projectName: string;

  @ApiPropertyOptional({ description: 'Description' })
  description: string | null;

  @ApiPropertyOptional({ description: 'Start date' })
  startDate: string | null;

  @ApiPropertyOptional({ description: 'End date' })
  endDate: string | null;

  @ApiProperty({ description: 'Owner ID' })
  ownerId: string;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiPropertyOptional({ description: 'Team ID' })
  teamId: string | null;

  @ApiPropertyOptional({ description: 'Workspace ID' })
  workspaceId: string | null;

  @ApiPropertyOptional({ description: 'Department ID' })
  departmentId: string | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Total number of tasks in the project' })
  taskCount?: number;

  @ApiPropertyOptional({ description: 'Number of completed tasks in the project' })
  completedTaskCount?: number;
}

export class ProjectMemberResponseDto {
  @ApiProperty({ description: 'Member ID' })
  memberId: string;

  @ApiProperty({ description: 'Project ID' })
  projectId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Joined date' })
  joinedAt: string;
}
