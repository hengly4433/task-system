import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { statusService, type TaskStatus, type CreateTaskStatusDto, type UpdateTaskStatusDto } from '@/services/status.service';

// ============================================================================
// TYPES
// ============================================================================

export type StatusScope = 'project' | 'department';

export interface UseStatusManagementOptions {
  /** Initial scope to use, defaults to 'project' */
  initialScope?: StatusScope;
  /** Auto-load on initialization, defaults to false */
  autoLoad?: boolean;
}

export interface UseStatusManagementReturn {
  // State
  statuses: Ref<TaskStatus[]>;
  scope: Ref<StatusScope>;
  selectedProjectId: Ref<string | null>;
  selectedDepartmentId: Ref<string | null>;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  error: Ref<string | null>;
  
  // Computed
  currentScopeId: ComputedRef<string | null>;
  canManage: ComputedRef<boolean>;
  defaultStatus: ComputedRef<TaskStatus | undefined>;
  terminalStatuses: ComputedRef<TaskStatus[]>;
  
  // Actions
  loadStatuses: () => Promise<void>;
  createStatus: (data: Omit<CreateTaskStatusDto, 'projectId' | 'departmentId'>) => Promise<TaskStatus>;
  updateStatus: (statusId: string, data: UpdateTaskStatusDto) => Promise<TaskStatus>;
  deleteStatus: (statusId: string) => Promise<void>;
  reorderStatuses: (orderedIds: string[]) => Promise<void>;
  initializeDefaults: () => Promise<void>;
  clearError: () => void;
  setScope: (newScope: StatusScope) => void;
}

// ============================================================================
// COMPOSABLE
// ============================================================================

/**
 * Composable for managing task statuses with project/department scope.
 * Provides reactive state management, CRUD operations, and reordering.
 * 
 * @example
 * ```typescript
 * const { 
 *   statuses, 
 *   scope, 
 *   loading, 
 *   selectedProjectId,
 *   loadStatuses, 
 *   createStatus 
 * } = useStatusManagement();
 * 
 * // Set project and load
 * selectedProjectId.value = '123';
 * await loadStatuses();
 * ```
 */
export function useStatusManagement(options: UseStatusManagementOptions = {}): UseStatusManagementReturn {
  const { initialScope = 'project', autoLoad = false } = options;
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  const statuses = ref<TaskStatus[]>([]);
  const scope = ref<StatusScope>(initialScope);
  const selectedProjectId = ref<string | null>(null);
  const selectedDepartmentId = ref<string | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  
  // ============================================================================
  // COMPUTED
  // ============================================================================
  
  /** Current scope ID based on selected scope type */
  const currentScopeId = computed(() => 
    scope.value === 'project' ? selectedProjectId.value : selectedDepartmentId.value
  );

  /** Whether we can perform management actions (scope is selected) */
  const canManage = computed(() => !!currentScopeId.value);

  /** The default status for new tasks */
  const defaultStatus = computed(() => 
    statuses.value.find(s => s.isDefault)
  );

  /** Terminal statuses (completed, cancelled, etc.) */
  const terminalStatuses = computed(() => 
    statuses.value.filter(s => s.isTerminal)
  );
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  /**
   * Clear current error state
   */
  function clearError(): void {
    error.value = null;
  }
  
  /**
   * Set the current scope and optionally clear statuses
   */
  function setScope(newScope: StatusScope): void {
    scope.value = newScope;
    statuses.value = [];
    error.value = null;
  }

  /**
   * Load statuses based on current scope and selection
   */
  async function loadStatuses(): Promise<void> {
    if (!currentScopeId.value) {
      statuses.value = [];
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      if (scope.value === 'project') {
        statuses.value = await statusService.getByProject(currentScopeId.value);
      } else {
        const result = await statusService.getAll({ 
          departmentId: currentScopeId.value, 
          pageSize: 100 
        });
        statuses.value = result.data;
      }
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to load statuses';
      statuses.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new status in the current scope
   */
  async function createStatus(data: Omit<CreateTaskStatusDto, 'projectId' | 'departmentId'>): Promise<TaskStatus> {
    if (!canManage.value) {
      throw new Error('Please select a project or department first');
    }
    
    saving.value = true;
    error.value = null;
    
    try {
      const payload: CreateTaskStatusDto = {
        ...data,
        ...(scope.value === 'project' && { projectId: selectedProjectId.value! }),
        ...(scope.value === 'department' && { departmentId: selectedDepartmentId.value! }),
      };
      
      const created = await statusService.create(payload);
      await loadStatuses(); // Refresh list
      return created;
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to create status';
      throw e;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Update an existing status
   */
  async function updateStatus(statusId: string, data: UpdateTaskStatusDto): Promise<TaskStatus> {
    saving.value = true;
    error.value = null;
    
    try {
      const updated = await statusService.update(statusId, data);
      await loadStatuses(); // Refresh list
      return updated;
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to update status';
      throw e;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Delete a status
   */
  async function deleteStatus(statusId: string): Promise<void> {
    saving.value = true;
    error.value = null;
    
    try {
      await statusService.delete(statusId);
      await loadStatuses(); // Refresh list
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to delete status';
      throw e;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Reorder statuses by providing new order of IDs
   */
  async function reorderStatuses(orderedIds: string[]): Promise<void> {
    saving.value = true;
    error.value = null;
    
    try {
      await statusService.reorder(orderedIds);
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to reorder statuses';
      await loadStatuses(); // Refresh on error to restore order
      throw e;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Initialize default statuses for current project
   */
  async function initializeDefaults(): Promise<void> {
    if (scope.value !== 'project' || !selectedProjectId.value) {
      throw new Error('Initialize defaults is only available for project scope');
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      await statusService.initializeDefaults(selectedProjectId.value);
      await loadStatuses();
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to initialize defaults';
      throw e;
    } finally {
      loading.value = false;
    }
  }
  
  // ============================================================================
  // WATCHERS
  // ============================================================================
  
  // Auto-reload when selection changes
  watch([selectedProjectId, selectedDepartmentId, scope], () => {
    if (autoLoad && currentScopeId.value) {
      loadStatuses().catch(() => {});
    }
  });
  
  // ============================================================================
  // RETURN
  // ============================================================================
  
  return {
    // State
    statuses,
    scope,
    selectedProjectId,
    selectedDepartmentId,
    loading,
    saving,
    error,
    // Computed
    currentScopeId,
    canManage,
    defaultStatus,
    terminalStatuses,
    // Actions
    loadStatuses,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    initializeDefaults,
    clearError,
    setScope,
  };
}
