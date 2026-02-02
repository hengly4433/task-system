import api from './api';

export interface Milestone {
  milestoneId: string;
  projectId: string;
  milestoneName: string;
  dueDate: string | null;
  createdAt: string;
}

export interface CreateMilestoneDto {
  projectId: string;
  milestoneName: string;
  dueDate?: string;
}

export const milestoneService = {
  async getAll(projectId?: string): Promise<Milestone[]> {
    const params = projectId ? { projectId } : {};
    const response = await api.get<Milestone[]>('/milestones', { params });
    return response.data;
  },

  async create(dto: CreateMilestoneDto): Promise<Milestone> {
    const response = await api.post<Milestone>('/milestones', dto);
    return response.data;
  },

  async update(milestoneId: string, dto: Partial<CreateMilestoneDto>): Promise<Milestone> {
    const response = await api.put<Milestone>(`/milestones/${milestoneId}`, dto);
    return response.data;
  },

  async delete(milestoneId: string): Promise<void> {
    await api.delete(`/milestones/${milestoneId}`);
  }
};
