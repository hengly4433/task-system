import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto, ListDepartmentsQueryDto } from './dto';
import { JwtAuthGuard } from '../auth';

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListDepartmentsQueryDto) {
    return this.departmentsService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.departmentsService.findById(id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.departmentsService.findByCode(code);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.departmentsService.delete(id);
  }

  // User-Department management endpoints
  @Post(':departmentId/users/:userId')
  addUserToDepartment(
    @Param('departmentId') departmentId: string,
    @Param('userId') userId: string,
    @Body() body: { isPrimary?: boolean },
  ) {
    return this.departmentsService.addUserToDepartment(userId, departmentId, body.isPrimary);
  }

  @Delete(':departmentId/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeUserFromDepartment(
    @Param('departmentId') departmentId: string,
    @Param('userId') userId: string,
  ) {
    return this.departmentsService.removeUserFromDepartment(userId, departmentId);
  }
}
