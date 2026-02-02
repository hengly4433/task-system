import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength, Matches } from 'class-validator';

export class CreateTaskStatusDto {
  @IsOptional()
  @IsString()
  projectId?: string;  // Status belongs to project (optional if departmentId is set)

  @IsOptional()
  @IsString()
  departmentId?: string; // Status belongs to department (optional if projectId is set)

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: 'Code must be uppercase with underscores (e.g., IN_PROGRESS)' })
  code: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color (e.g., #FF5733)' })
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
