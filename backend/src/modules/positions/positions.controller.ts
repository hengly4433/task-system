import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PositionsService } from './positions.service';
import { CreatePositionDto, UpdatePositionDto, PositionResponseDto } from './dto';

@ApiTags('Positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all positions' })
  @ApiResponse({ status: 200, type: [PositionResponseDto] })
  async findAll(): Promise<PositionResponseDto[]> {
    return this.positionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  @ApiResponse({ status: 200, type: PositionResponseDto })
  async findById(@Param('id') id: string): Promise<PositionResponseDto> {
    return this.positionsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new position' })
  @ApiResponse({ status: 201, type: PositionResponseDto })
  async create(@Body() dto: CreatePositionDto): Promise<PositionResponseDto> {
    return this.positionsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a position' })
  @ApiResponse({ status: 200, type: PositionResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
  ): Promise<PositionResponseDto> {
    return this.positionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a position' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string): Promise<void> {
    return this.positionsService.delete(id);
  }
}
