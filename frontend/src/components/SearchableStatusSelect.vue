<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { statusService, type TaskStatus } from '@/services/status.service';

defineOptions({
  name: 'SearchableStatusSelect',
});

const props = defineProps<{
  modelValue: string;
  projectId?: string;  // Now uses projectId instead of workspace store
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  dense?: boolean;
  hideDetails?: boolean | 'auto';
  clearable?: boolean;
  rules?: ((v: string) => boolean | string)[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', status: TaskStatus | null): void;
}>();

const statuses = ref<TaskStatus[]>([]);
const loading = ref(false);
const search = ref('');

const selectedValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const filteredStatuses = computed(() => {
  if (!search.value) return statuses.value;
  const query = search.value.toLowerCase();
  return statuses.value.filter(
    (s) => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query)
  );
});

const statusItems = computed(() => {
  return filteredStatuses.value.map((s) => ({
    title: s.name,
    value: s.code,
    color: s.color,
    status: s,
  }));
});

const loadStatuses = async () => {
  if (!props.projectId) {
    statuses.value = [];
    return;
  }
  loading.value = true;
  try {
    statuses.value = await statusService.getByProject(props.projectId);
  } catch (e) {
    console.error('Failed to load statuses', e);
    statuses.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadStatuses();
});

// Reload when projectId changes
watch(() => props.projectId, () => {
  loadStatuses();
});

const handleChange = (code: string) => {
  const status = statuses.value.find((s) => s.code === code) || null;
  emit('change', status);
};

const getStatusColor = (code: string) => {
  const status = statuses.value.find((s) => s.code === code);
  return status?.color || '#64748B';
};
</script>

<template>
  <v-autocomplete
    v-model="selectedValue"
    :items="statusItems"
    :loading="loading"
    :label="label || 'Status'"
    :placeholder="placeholder || 'Select status'"
    :disabled="disabled || !projectId"
    :density="dense ? 'compact' : 'default'"
    :hide-details="hideDetails"
    :clearable="clearable"
    :rules="rules"
    variant="outlined"
    rounded="lg"
    item-title="title"
    item-value="value"
    @update:model-value="handleChange"
    @update:search="search = $event"
  >
    <template #selection="{ item }">
      <div class="d-flex align-center gap-2">
        <span 
          class="status-dot" 
          :style="{ backgroundColor: item.raw.color }"
        ></span>
        <span>{{ item.raw.title }}</span>
      </div>
    </template>
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template #prepend>
          <span 
            class="status-dot mr-2" 
            :style="{ backgroundColor: item.raw.color }"
          ></span>
        </template>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<style scoped>
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
