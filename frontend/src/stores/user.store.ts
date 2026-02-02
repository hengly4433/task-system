import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userService, type User, type UserFilters, type UpdateUserDto } from '@/services/user.service'

export const useUserStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const currentUser = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)

  async function fetchUsers(filters?: UserFilters) {
    loading.value = true
    error.value = null
    try {
      const response = await userService.getAll(filters)
      users.value = response.data
      total.value = response.total
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch users'
    } finally {
      loading.value = false
    }
  }

  async function fetchUser(id: string) {
    loading.value = true
    error.value = null
    try {
      currentUser.value = await userService.getById(id)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch user'
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: string, data: UpdateUserDto) {
    loading.value = true
    error.value = null
    try {
      const updated = await userService.update(id, data)
      const index = users.value.findIndex(u => u.userId === id)
      if (index !== -1) {
        users.value[index] = updated
      }
      return updated
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update user'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id: string) {
    loading.value = true
    error.value = null
    try {
      await userService.delete(id)
      users.value = users.value.filter(u => u.userId !== id)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete user'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    currentUser,
    loading,
    error,
    total,
    fetchUsers,
    fetchUser,
    updateUser,
    deleteUser,
  }
})
