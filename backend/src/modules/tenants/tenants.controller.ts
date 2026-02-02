import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto, AddTenantMemberDto, UpdateTenantMemberDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SkipTenantGuard } from '../../common/tenant/decorators';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('my-tenants')
  @SkipTenantGuard()
  @ApiOperation({ summary: 'Get current user\'s tenants' })
  async getMyTenants(@CurrentUser('userId') userId: string) {
    return this.tenantsService.findUserTenants(BigInt(userId));
  }

  @Get()
  @SkipTenantGuard()
  @ApiOperation({ summary: 'Get all tenants (super admin only)' })
  async findAll() {
    // TODO: Add super admin check
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findById(@Param('id') id: string) {
    return this.tenantsService.findById(BigInt(id));
  }

  @Post()
  @SkipTenantGuard()
  @ApiOperation({ summary: 'Create a new tenant' })
  async create(
    @Body() dto: CreateTenantDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tenantsService.create(dto, BigInt(userId));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(BigInt(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tenant' })
  async delete(@Param('id') id: string) {
    return this.tenantsService.delete(BigInt(id));
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get tenant members' })
  async getMembers(@Param('id') id: string) {
    return this.tenantsService.getMembers(BigInt(id));
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to tenant' })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddTenantMemberDto,
  ) {
    return this.tenantsService.addMember(BigInt(id), dto);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateTenantMemberDto,
  ) {
    return this.tenantsService.updateMemberRole(BigInt(id), BigInt(userId), dto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from tenant' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.tenantsService.removeMember(BigInt(id), BigInt(userId));
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set tenant as default for current user' })
  async setDefaultTenant(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tenantsService.setDefaultTenant(BigInt(userId), BigInt(id));
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'Upload tenant logo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ logoUrl: string }> {
    return this.tenantsService.uploadLogo(BigInt(id), file);
  }
}
