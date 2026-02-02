import api from './api'

export interface DashboardSummary {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasksCount: number
  upcomingMeetings: number
  totalTimeLogged: number
  tasksByPriority: {
    high: number
    medium: number
    low: number
  }
  tasksByStatus: {
    notStarted: number
    inProgress: number
    inReview: number
    completed: number
    cancelled: number
  }
}

export interface TasksCompletedChart {
  labels: string[]
  data: number[]
}

export interface SpentTimeChart {
  labels: string[]
  data: number[]
  colors: string[]
}

export interface TeamPerformance {
  userId: string
  fullName: string
  profileImageUrl: string | null
  tasksCompleted: number
  hoursLogged: number
}

export const reportService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await api.get('/reports/dashboard')
    return response.data
  },

  async getTasksCompletedChart(startDate: string, endDate: string): Promise<TasksCompletedChart> {
    const response = await api.get('/reports/tasks-completed', {
      params: { startDate, endDate }
    })
    return response.data
  },

  async getSpentTimeByDepartment(startDate: string, endDate: string): Promise<SpentTimeChart> {
    const response = await api.get('/reports/spent-time', {
      params: { startDate, endDate }
    })
    return response.data
  },

  async getTeamPerformance(teamId?: string): Promise<TeamPerformance[]> {
    const response = await api.get('/reports/team-performance', {
      params: { teamId }
    })
    return response.data
  },

  async getTimesheetSummary(startDate: string, endDate: string): Promise<any> {
    const response = await api.get('/reports/timesheet-summary', {
      params: { startDate, endDate }
    })
    return response.data
  },

  async getProjectReport(projectId: string): Promise<any> {
    const response = await api.get(`/reports/project/${projectId}`)
    return response.data
  },
}
