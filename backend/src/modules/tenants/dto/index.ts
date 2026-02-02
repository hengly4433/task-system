import { IsString, IsOptional, IsEnum, MaxLength, Matches, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: 'Organization name', example: 'Acme Corporation' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'URL-friendly slug for subdomain', example: 'acme-corp' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens only' })
  slug: string;

  @ApiPropertyOptional({ description: 'Custom domain', example: 'app.acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ description: 'Subscription plan', default: 'FREE' })
  @IsOptional()
  @IsString()
  plan?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Organization name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'URL-friendly slug' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens only' })
  slug?: string;

  @ApiPropertyOptional({ description: 'Custom domain' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Primary brand color', example: '#f1184c' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color' })
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Tenant status', enum: ['ACTIVE', 'SUSPENDED', 'TRIAL'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'SUSPENDED', 'TRIAL'])
  status?: string;

  @ApiPropertyOptional({ description: 'Subscription plan' })
  @IsOptional()
  @IsString()
  plan?: string;

  // Company Information
  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Industry type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size range', example: '11-50' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companySize?: string;

  @ApiPropertyOptional({ description: 'Year founded' })
  @IsOptional()
  @IsInt()
  foundedYear?: number;

  @ApiPropertyOptional({ description: 'Tax ID / VAT number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  // Contact Information
  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Company email' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Company website' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  // Address
  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Postal/ZIP code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}

export class AddTenantMemberDto {
  @ApiProperty({ description: 'User ID to add' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Role in tenant', default: 'MEMBER', enum: ['OWNER', 'ADMIN', 'MEMBER'] })
  @IsOptional()
  @IsEnum(['OWNER', 'ADMIN', 'MEMBER'])
  role?: string;
}

export class UpdateTenantMemberDto {
  @ApiProperty({ description: 'New role', enum: ['OWNER', 'ADMIN', 'MEMBER'] })
  @IsEnum(['OWNER', 'ADMIN', 'MEMBER'])
  role: string;
}
