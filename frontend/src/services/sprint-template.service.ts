import api from './api';

export interface SprintTemplate {
  templateId: string;
  departmentId: string;
  name: string;
  namePattern: string | null;
  durationDays: number;
  goalTemplate: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSprintTemplateDto {
  departmentId: string;
  name: string;
  namePattern?: string;
  durationDays?: number;
  goalTemplate?: string;
  isDefault?: boolean;
}

export interface UpdateSprintTemplateDto {
  name?: string;
  namePattern?: string;
  durationDays?: number;
  goalTemplate?: string;
  isDefault?: boolean;
}

export const sprintTemplateService = {
  /**
   * Get all templates (paginated)
   */
  async getAll(params?: { departmentId?: string; search?: string; page?: number; pageSize?: number }): Promise<{ data: SprintTemplate[]; meta: any }> {
    const response = await api.get('/sprint-templates', { params });
    return response.data;
  },

  /**
   * Get templates by department (unpaginated, for dropdowns)
   */
  async getByDepartment(departmentId: string): Promise<SprintTemplate[]> {
    const response = await api.get(`/departments/${departmentId}/sprint-templates`);
    return response.data;
  },

  /**
   * Get a single template by ID
   */
  async getById(templateId: string): Promise<SprintTemplate> {
    const response = await api.get(`/sprint-templates/${templateId}`);
    return response.data;
  },

  /**
   * Create a new template
   */
  async create(data: CreateSprintTemplateDto): Promise<SprintTemplate> {
    const response = await api.post('/sprint-templates', data);
    return response.data;
  },

  /**
   * Update an existing template
   */
  async update(templateId: string, data: UpdateSprintTemplateDto): Promise<SprintTemplate> {
    const response = await api.patch(`/sprint-templates/${templateId}`, data);
    return response.data;
  },

  /**
   * Delete a template
   */
  async delete(templateId: string): Promise<void> {
    await api.delete(`/sprint-templates/${templateId}`);
  },
};
