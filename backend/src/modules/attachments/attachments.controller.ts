import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto, AttachmentResponseDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('tasks/:taskId/attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file attachment to Supabase' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  async uploadFile(
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: bigint,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.uploadFile(taskId, file, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add attachment metadata to a task (manual path)' })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  async create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateAttachmentDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.create(taskId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all attachments for a task' })
  async findByTask(@Param('taskId') taskId: string): Promise<AttachmentResponseDto[]> {
    return this.attachmentsService.findByTask(taskId);
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attachment' })
  async delete(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<void> {
    return this.attachmentsService.delete(attachmentId, userId);
  }
}
