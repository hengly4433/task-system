import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { UpsertPreferenceDto, PreferenceResponseDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Preferences')
@ApiBearerAuth()
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Put()
  @ApiOperation({ summary: 'Upsert a preference' })
  async upsert(@Body() dto: UpsertPreferenceDto, @CurrentUser('userId') userId: bigint): Promise<PreferenceResponseDto> {
    return this.preferencesService.upsert(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all preferences for current user' })
  async findByUser(@CurrentUser('userId') userId: bigint): Promise<PreferenceResponseDto[]> {
    return this.preferencesService.findByUser(userId);
  }
}
