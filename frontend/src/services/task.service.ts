import api from './api'

// Status values (matching backend API)
export const STATUS_VALUES = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
} as const

// Priority values (matching backend API)
export const PRIORITY_VALUES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const

export interface Task {
  taskId: string
  title: string
  description: string | null
  projectId: string
  status: string
  priority: string
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  progress: number
  taskType: string
  estimatedHours: number | null
  remainingHours: number | null
  storyPoints: number | null
  createdById: string
  assigneeId: string | null
  testerId: string | null
  sprintId: string | null
  parentTaskId: string | null
  // Department/Workflow scoping
  departmentId: string | null
  workspaceId: string | null
  statusId: string | null
  department?: {
    departmentId: string
    name: string
    code: string
  }
  workspace?: {
    workspaceId: string
    name: string
  }
  taskStatus?: {
    statusId: string
    name: string
    code: string
    color: string
  }
  // DETAILS section fields
  milestoneId: string | null
  milestone: { milestoneId: string; milestoneName: string } | null
  team: string | null
  teamId?: string | null
  assignedTeam?: {
    teamId: string
    teamName: string
  }
  module: string | null
  externalLink: string | null
  buildVersion: string | null
  createdAt: string
  updatedAt: string
  assignee?: {
    userId: string
    username: string
    fullName: string | null
    profileImageUrl: string | null
  }
  creator?: {
    userId: string
    username: string
    fullName: string | null
    profileImageUrl: string | null
  }
  tester?: {
    userId: string
    username: string
    fullName: string | null
    profileImageUrl: string | null
  }
  parent?: {
    taskId: string
    taskName: string
  }
  project?: {
    projectId: string
    name: string
  }
  sprint?: {
    sprintId: string
    name: string
  }
  watcherCount?: number
}

export interface CreateTaskDto {
  title: string
  description?: string
  projectId: string
  status?: string
  priority?: string
  startDate?: string
  sprintId?: string
  parentTaskId?: string
  milestoneId?: string // New field for creation
  taskType?: string
  estimatedHours?: number
  remainingHours?: number
  storyPoints?: number
  // Department/Workflow scoping
  departmentId?: string
  workspaceId?: string
  statusId?: string
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: string
  priority?: string
  startDate?: string
  dueDate?: string
  assigneeId?: string | null
  testerId?: string | null
  sprintId?: string | null
  progress?: number
  taskType?: string
  estimatedHours?: number | null
  remainingHours?: number | null
  storyPoints?: number | null
  // Details
  milestoneId?: string | null
  team?: string | null
  teamId?: string | null
  module?: string | null
  externalLink?: string | null
  buildVersion?: string | null
  parentTaskId?: string | null
  // Department/Workflow scoping
  departmentId?: string | null
  workspaceId?: string | null
  statusId?: string | null
}

export interface TaskFilters {
  projectId?: string
  status?: string
  priority?: string
  assigneeId?: string
  search?: string
  page?: number
  pageSize?: number
}

// Transform API response to frontend format
function mapTaskFromApi(apiTask: any): Task {
  return {
    taskId: String(apiTask.taskId),
    title: apiTask.taskName,
    description: apiTask.description,
    projectId: String(apiTask.projectId),
    status: apiTask.status || 'TODO',
    priority: apiTask.priority || 'MEDIUM',
    startDate: apiTask.startDate,
    dueDate: apiTask.dueDate,
    completedAt: apiTask.completedAt,
    progress: apiTask.progress || 0,
    taskType: apiTask.taskType || 'TASK',
    estimatedHours: apiTask.estimatedHours !== null ? Number(apiTask.estimatedHours) : null,
    remainingHours: apiTask.remainingHours !== null ? Number(apiTask.remainingHours) : null,
    storyPoints: apiTask.storyPoints !== null ? Number(apiTask.storyPoints) : null,
    createdById: String(apiTask.createdBy),
    assigneeId: apiTask.assignedTo ? String(apiTask.assignedTo) : null,
    testerId: apiTask.testerId ? String(apiTask.testerId) : null,
    sprintId: apiTask.sprintId ? String(apiTask.sprintId) : null,
    parentTaskId: apiTask.parentTaskId ? String(apiTask.parentTaskId) : null,
    // Department/Workflow scoping
    departmentId: apiTask.departmentId ? String(apiTask.departmentId) : null,
    workspaceId: apiTask.workspaceId ? String(apiTask.workspaceId) : null,
    statusId: apiTask.statusId ? String(apiTask.statusId) : null,
    department: apiTask.department
      ? {
          departmentId: String(apiTask.department.departmentId),
          name: apiTask.department.name,
          code: apiTask.department.code,
        }
      : undefined,
    workspace: apiTask.workspace
      ? {
          workspaceId: String(apiTask.workspace.workspaceId),
          name: apiTask.workspace.name,
        }
      : undefined,
    taskStatus: apiTask.taskStatus
      ? {
          statusId: String(apiTask.taskStatus.statusId),
          name: apiTask.taskStatus.name,
          code: apiTask.taskStatus.code,
          color: apiTask.taskStatus.color,
        }
      : undefined,
    // DETAILS section fields
    milestoneId: apiTask.milestoneId ? String(apiTask.milestoneId) : null,
    milestone: apiTask.milestone || null,
    team: apiTask.team || null,
    module: apiTask.module || null,
    externalLink: apiTask.externalLink || null,
    buildVersion: apiTask.buildVersion || null,
    createdAt: apiTask.createdAt,
    updatedAt: apiTask.updatedAt,
    assignee: apiTask.assignee
      ? {
          userId: String(apiTask.assignee.userId),
          username: apiTask.assignee.username || '',
          fullName: apiTask.assignee.fullName,
          profileImageUrl: apiTask.assignee.profileImageUrl,
        }
      : undefined,
    creator: apiTask.creator
      ? {
          userId: String(apiTask.creator.userId),
          username: apiTask.creator.username || '',
          fullName: apiTask.creator.fullName,
          profileImageUrl: apiTask.creator.profileImageUrl,
        }
      : undefined,
    tester: apiTask.tester
      ? {
          userId: String(apiTask.tester.userId),
          username: apiTask.tester.username || '',
          fullName: apiTask.tester.fullName,
          profileImageUrl: apiTask.tester.profileImageUrl,
        }
      : undefined,
    parent: apiTask.parent
      ? {
          taskId: String(apiTask.parent.taskId),
          taskName: apiTask.parent.taskName,
        }
      : undefined,
    project: apiTask.project
      ? {
          projectId: String(apiTask.project.projectId),
          name: apiTask.project.name || apiTask.project.projectName,
        }
      : undefined,
    sprint: apiTask.sprint
      ? {
          sprintId: String(apiTask.sprint.sprintId),
          name: apiTask.sprint.sprintName,
        }
      : undefined,
    watcherCount: apiTask.watcherCount,
  }
}

// Transform frontend data to API format
function mapTaskToApi(data: CreateTaskDto | UpdateTaskDto): any {
  const apiData: any = {}

  if ('title' in data && data.title !== undefined) {
    apiData.taskName = data.title
  }
  if ('description' in data) {
    apiData.description = data.description
  }
  if ('status' in data && data.status) {
    apiData.status = data.status
  }
  if ('priority' in data && data.priority) {
    apiData.priority = data.priority
  }
  if ('startDate' in data && data.startDate) {
    apiData.startDate = data.startDate
  }
  if ('dueDate' in data && data.dueDate) {
    apiData.dueDate = data.dueDate
  }
  if ('assigneeId' in data) {
    apiData.assignedTo = data.assigneeId ? parseInt(data.assigneeId, 10) : null
  }
  if ('testerId' in data) {
    apiData.testerId = data.testerId ? parseInt(data.testerId, 10) : null
  }
  if ('sprintId' in data) {
    apiData.sprintId = data.sprintId ? parseInt(data.sprintId, 10) : null
  }
  if ('parentTaskId' in data) {
    if ((data as any).parentTaskId) {
      apiData.parentTaskId = parseInt((data as any).parentTaskId, 10)
    } else {
      apiData.parentTaskId = null
    }
  }
  if ('milestoneId' in data) {
    if (data.milestoneId) {
       (apiData as any).milestoneId = parseInt(data.milestoneId, 10)
    } else {
       (apiData as any).milestoneId = null
    }
  }
  // if ('milestone' in data) apiData.milestone = data.milestone // Removed legacy string field
  if ('team' in data) apiData.team = data.team
  if ('module' in data) apiData.module = data.module
  if ('externalLink' in data) apiData.externalLink = data.externalLink
  if ('buildVersion' in data) apiData.buildVersion = data.buildVersion
  
  // Department/Workflow scoping
  if ('departmentId' in data) {
    (apiData as any).departmentId = data.departmentId ? parseInt(data.departmentId as string, 10) : null
  }
  if ('workspaceId' in data) {
    (apiData as any).workspaceId = data.workspaceId ? parseInt(data.workspaceId as string, 10) : null
  }
  if ('statusId' in data) {
    (apiData as any).statusId = data.statusId ? parseInt(data.statusId as string, 10) : null
  }

  return apiData
}

export const taskService = {
  async getAll(filters?: TaskFilters): Promise<{ data: Task[]; total: number }> {
    // If projectId is provided, use the project-specific endpoint
    if (filters?.projectId) {
      const response = await api.get(`/projects/${filters.projectId}/tasks`, {
        params: {
          page: filters?.page || 1,
          pageSize: filters?.pageSize || 50,
          status: filters?.status,
          priority: filters?.priority,
          assignedTo: filters?.assigneeId,
          search: filters?.search,
        },
      })
      const result = response.data
      return {
        data: (result.data || result).map(mapTaskFromApi),
        total: result.totalItems || result.total || (result.data || result).length,
      }
    }

    // Otherwise, fetch all tasks (may need to iterate projects)
    const response = await api.get('/tasks', { params: filters })
    const result = response.data
    return {
      data: (result.data || result).map(mapTaskFromApi),
      total: result.totalItems || result.total || (result.data || result).length,
    }
  },

  async getById(id: string): Promise<Task> {
    const response = await api.get(`/tasks/${id}`)
    return mapTaskFromApi(response.data)
  },

  async create(data: CreateTaskDto): Promise<Task> {
    const apiData = mapTaskToApi(data)
    // API requires projectId in the URL
    const response = await api.post(`/projects/${data.projectId}/tasks`, apiData)
    return mapTaskFromApi(response.data)
  },

  async update(id: string, data: UpdateTaskDto): Promise<Task> {
    const apiData = mapTaskToApi(data)
    const response = await api.patch(`/tasks/${id}`, apiData)
    return mapTaskFromApi(response.data)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`)
  },

  async getByProject(projectId: string): Promise<Task[]> {
    const response = await api.get(`/projects/${projectId}/tasks`)
    const result = response.data
    return (result.data || result).map(mapTaskFromApi)
  },

  async updateStatus(id: string, status: string): Promise<Task> {
    const response = await api.patch(`/tasks/${id}`, { status })
    return mapTaskFromApi(response.data)
  },

  async updateProgress(id: string, progress: number): Promise<Task> {
    const response = await api.patch(`/tasks/${id}`, { progress })
    return mapTaskFromApi(response.data)
  },

  async assignTo(id: string, assigneeId: string): Promise<Task> {
    const response = await api.patch(`/tasks/${id}`, {
      assignedTo: parseInt(assigneeId, 10),
    })
    return mapTaskFromApi(response.data)
  },

  async assignToSprint(taskId: string, sprintId: string): Promise<void> {
    await api.patch(`/tasks/${taskId}/sprint`, { sprintId })
  },

  async removeFromSprint(taskId: string): Promise<Task> {
    const response = await api.patch(`/tasks/${taskId}`, { sprintId: null })
    return mapTaskFromApi(response.data)
  },

  async getSubtasks(taskId: string): Promise<Task[]> {
    const response = await api.get(`/tasks/${taskId}/subtasks`)
    return response.data.map(mapTaskFromApi)
  },

  async getHistory(taskId: string): Promise<any[]> {
    const response = await api.get(`/tasks/${taskId}/history`)
    return response.data
  },
}

