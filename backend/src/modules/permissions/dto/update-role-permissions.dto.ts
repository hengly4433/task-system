import { IsArray, ValidateNested, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PermissionGrantDto {
  @ApiProperty({ description: 'Permission ID' })
  @IsString()
  permissionId: string;

  @ApiProperty({ description: 'Whether permission is granted' })
  @IsBoolean()
  granted: boolean;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ description: 'List of permission grants', type: [PermissionGrantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions: PermissionGrantDto[];
}
