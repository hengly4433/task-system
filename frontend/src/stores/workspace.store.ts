import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { workspaceService, type Workspace, type CreateWorkspaceDto, type UpdateWorkspaceDto } from '@/services/workspace.service'

const SELECTED_WORKSPACE_KEY = 'selectedWorkspaceId'

export const useWorkspaceStore = defineStore('workspaces', () => {
  const workspaces = ref<Workspace[]>([])
  const currentWorkspace = ref<Workspace | null>(null)
  const selectedWorkspaceId = ref<string | null>(localStorage.getItem(SELECTED_WORKSPACE_KEY))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const selectedWorkspace = computed(() => {
    if (!selectedWorkspaceId.value) return null
    return workspaces.value.find(w => w.workspaceId === selectedWorkspaceId.value) || null
  })

  async function fetchWorkspaces() {
    loading.value = true
    error.value = null
    try {
      workspaces.value = await workspaceService.getAll()
      // Auto-select first workspace if none selected
      if (!selectedWorkspaceId.value && workspaces.value.length > 0) {
        const firstWorkspace = workspaces.value[0]
        if (firstWorkspace) {
          setSelectedWorkspaceId(firstWorkspace.workspaceId)
        }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch workspaces'
    } finally {
      loading.value = false
    }
  }

  async function fetchWorkspace(id: string) {
    loading.value = true
    error.value = null
    try {
      currentWorkspace.value = await workspaceService.getById(id)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch workspace'
    } finally {
      loading.value = false
    }
  }

  async function createWorkspace(data: CreateWorkspaceDto) {
    loading.value = true
    error.value = null
    try {
      const newWorkspace = await workspaceService.create(data)
      workspaces.value.unshift(newWorkspace)
      // Auto-select newly created workspace
      setSelectedWorkspaceId(newWorkspace.workspaceId)
      return newWorkspace
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create workspace'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateWorkspace(id: string, data: UpdateWorkspaceDto) {
    loading.value = true
    error.value = null
    try {
      const updated = await workspaceService.update(id, data)
      const index = workspaces.value.findIndex(w => w.workspaceId === id)
      if (index !== -1) {
        workspaces.value[index] = updated
      }
      if (currentWorkspace.value?.workspaceId === id) {
        currentWorkspace.value = updated
      }
      return updated
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update workspace'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteWorkspace(id: string) {
    loading.value = true
    error.value = null
    try {
      await workspaceService.delete(id)
      workspaces.value = workspaces.value.filter(w => w.workspaceId !== id)
      if (currentWorkspace.value?.workspaceId === id) {
        currentWorkspace.value = null
      }
      // If deleted workspace was selected, select another one
      if (selectedWorkspaceId.value === id) {
        const nextWorkspace = workspaces.value[0]
        if (nextWorkspace) {
          setSelectedWorkspaceId(nextWorkspace.workspaceId)
        } else {
          setSelectedWorkspaceId(null)
        }
      }
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete workspace'
      return false
    } finally {
      loading.value = false
    }
  }

  function setCurrentWorkspace(workspace: Workspace | null) {
    currentWorkspace.value = workspace
  }

  function setSelectedWorkspaceId(id: string | null) {
    selectedWorkspaceId.value = id
    if (id) {
      localStorage.setItem(SELECTED_WORKSPACE_KEY, id)
    } else {
      localStorage.removeItem(SELECTED_WORKSPACE_KEY)
    }
  }

  return {
    workspaces,
    currentWorkspace,
    selectedWorkspaceId,
    selectedWorkspace,
    loading,
    error,
    fetchWorkspaces,
    fetchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setCurrentWorkspace,
    setSelectedWorkspaceId,
  }
})

