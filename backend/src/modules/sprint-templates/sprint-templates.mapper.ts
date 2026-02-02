import { SprintTemplateResponseDto } from './dto';

export class SprintTemplatesMapper {
  static toResponse(template: any): SprintTemplateResponseDto {
    return {
      templateId: template.templateId.toString(),
      departmentId: template.departmentId.toString(),
      name: template.name,
      namePattern: template.namePattern || null,
      durationDays: template.durationDays,
      goalTemplate: template.goalTemplate || null,
      isDefault: template.isDefault,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  static toResponseList(templates: any[]): SprintTemplateResponseDto[] {
    return templates.map((t) => this.toResponse(t));
  }
}
