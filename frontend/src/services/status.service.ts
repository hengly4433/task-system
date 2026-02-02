import api from './api';

export interface TaskStatus {
  statusId: string;
  projectId: string | null;  // Belongs to project (null = global template)
  departmentId: string | null; // Belongs to department
  name: string;
  code: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  isTerminal: boolean;  // Marks completed/end states (e.g., Done, Cancelled)
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskStatusDto {
  projectId?: string;  // Assign to project
  departmentId?: string; // Assign to department
  name: string;
  code: string;
  color?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface UpdateTaskStatusDto {
  name?: string;
  code?: string;
  color?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface TaskStatusListResponse {
  data: TaskStatus[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const statusService = {
  /**
   * Get all statuses (paginated)
   */
  async getAll(params?: { projectId?: string; departmentId?: string; search?: string; page?: number; pageSize?: number }): Promise<TaskStatusListResponse> {
    const response = await api.get('/task-statuses', { params });
    return response.data;
  },

  /**
   * Get statuses by project (unpaginated, for dropdowns)
   */
  async getByProject(projectId?: string): Promise<TaskStatus[]> {
    const response = await api.get('/task-statuses/by-project', { params: { projectId } });
    return response.data;
  },

  /**
   * Get a single status by ID
   */
  async getById(statusId: string): Promise<TaskStatus> {
    const response = await api.get(`/task-statuses/${statusId}`);
    return response.data;
  },

  /**
   * Create a new status
   */
  async create(data: CreateTaskStatusDto): Promise<TaskStatus> {
    const response = await api.post('/task-statuses', data);
    return response.data;
  },

  /**
   * Update an existing status
   */
  async update(statusId: string, data: UpdateTaskStatusDto): Promise<TaskStatus> {
    const response = await api.patch(`/task-statuses/${statusId}`, data);
    return response.data;
  },

  /**
   * Delete a status
   */
  async delete(statusId: string): Promise<void> {
    await api.delete(`/task-statuses/${statusId}`);
  },

  /**
   * Reorder statuses
   */
  async reorder(statusIds: string[]): Promise<TaskStatus[]> {
    const response = await api.post('/task-statuses/reorder', { statusIds });
    return response.data;
  },

  /**
   * Initialize default statuses for a project
   */
  async initializeDefaults(projectId: string): Promise<TaskStatus[]> {
    const response = await api.post(`/task-statuses/initialize/${projectId}`);
    return response.data;
  },
};
