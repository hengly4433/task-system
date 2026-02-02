import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { taskService, type Task, type TaskFilters, type CreateTaskDto, type UpdateTaskDto } from '@/services/task.service'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const currentTask = ref<Task | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)

  // Computed
  const tasksByStatus = computed(() => {
    return {
      notStarted: tasks.value.filter(t => t.status === 'TODO'),
      inProgress: tasks.value.filter(t => t.status === 'IN_PROGRESS'),
      inReview: tasks.value.filter(t => t.status === 'IN_REVIEW'),
      completed: tasks.value.filter(t => t.status === 'DONE'),
      cancelled: tasks.value.filter(t => t.status === 'CANCELLED'),
    }
  })

  const tasksByPriority = computed(() => {
    return {
      high: tasks.value.filter(t => t.priority === 'HIGH').length,
      medium: tasks.value.filter(t => t.priority === 'MEDIUM').length,
      low: tasks.value.filter(t => t.priority === 'LOW').length,
    }
  })

  // Actions
  async function fetchTasks(filters?: TaskFilters) {
    loading.value = true
    error.value = null
    try {
      const response = await taskService.getAll(filters)
      tasks.value = response.data
      total.value = response.total
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch tasks'
    } finally {
      loading.value = false
    }
  }

  async function fetchTask(id: string) {
    loading.value = true
    error.value = null
    try {
      currentTask.value = await taskService.getById(id)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch task'
    } finally {
      loading.value = false
    }
  }

  async function createTask(data: CreateTaskDto) {
    loading.value = true
    error.value = null
    try {
      const newTask = await taskService.create(data)
      tasks.value.unshift(newTask)
      return newTask
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create task'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateTask(id: string, data: UpdateTaskDto) {
    loading.value = true
    error.value = null
    try {
      const updatedTask = await taskService.update(id, data)
      const index = tasks.value.findIndex(t => t.taskId === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
      if (currentTask.value?.taskId === id) {
        currentTask.value = updatedTask
      }
      return updatedTask
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update task'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteTask(id: string) {
    loading.value = true
    error.value = null
    try {
      await taskService.delete(id)
      tasks.value = tasks.value.filter(t => t.taskId !== id)
      if (currentTask.value?.taskId === id) {
        currentTask.value = null
      }
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete task'
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateTaskStatus(id: string, status: string) {
    try {
      const updatedTask = await taskService.updateStatus(id, status)
      const index = tasks.value.findIndex(t => t.taskId === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
      return updatedTask
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update status'
      return null
    }
  }

  return {
    tasks,
    currentTask,
    loading,
    error,
    total,
    tasksByStatus,
    tasksByPriority,
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  }
})
