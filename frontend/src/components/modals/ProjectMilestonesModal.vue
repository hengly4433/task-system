<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { milestoneService, type Milestone } from "@/services/milestone.service";
import MilestoneModal from "./MilestoneModal.vue";
import { useSnackbar } from "@/composables/useSnackbar";

const props = defineProps<{
  modelValue: boolean;
  projectId: string;
  projectName: string;
}>();

const emit = defineEmits(["update:modelValue"]);

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const snackbar = useSnackbar();
const milestones = ref<Milestone[]>([]);
const loading = ref(false);

// Edit/Create state
const showMilestoneModal = ref(false);
const editingMilestone = ref<Milestone | null>(null);

const loadMilestones = async () => {
  if (!props.projectId) return;
  loading.value = true;
  try {
    milestones.value = await milestoneService.getAll(props.projectId);
  } catch (error) {
    console.error("Failed to load milestones", error);
    snackbar.error("Failed to load milestones");
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      loadMilestones();
    }
  }
);

const openCreate = () => {
  editingMilestone.value = null;
  showMilestoneModal.value = true;
};

const openEdit = (milestone: Milestone) => {
  editingMilestone.value = milestone;
  showMilestoneModal.value = true;
};

const handleDelete = async (milestoneId: string) => {
  if (!confirm("Are you sure you want to delete this milestone?")) return;
  try {
    await milestoneService.delete(milestoneId);
    snackbar.success("Milestone deleted");
    await loadMilestones();
  } catch (error) {
    snackbar.error("Failed to delete milestone");
  }
};

const handleSaveMilestone = async (data: any) => {
  try {
    if (data.milestoneId) {
      await milestoneService.update(data.milestoneId, data);
      snackbar.success("Milestone updated");
    } else {
      await milestoneService.create(data);
      snackbar.success("Milestone created");
    }
    showMilestoneModal.value = false;
    await loadMilestones();
  } catch (error) {
    console.error("Failed to save milestone", error);
    snackbar.error("Failed to save milestone");
  }
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="700">
    <v-card rounded="xl" class="d-flex flex-column" style="max-height: 80vh">
      <v-card-title class="pa-4 d-flex align-center">
        <div>
          <div class="text-h6 font-weight-bold">Milestones</div>
          <div class="text-caption text-grey">{{ projectName }}</div>
        </div>
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          @click="openCreate"
        >
          Add Milestone
        </v-btn>
        <v-btn icon variant="text" class="ml-2" @click="dialog = false">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-card-title>
      
      <v-divider />

      <v-card-text class="pa-0 flex-grow-1" style="overflow-y: auto;">
        <div v-if="loading" class="d-flex justify-center pa-4">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <div v-else-if="milestones.length === 0" class="text-center pa-8 text-grey">
          <v-icon icon="mdi-flag-outline" size="48" class="mb-2" />
          <div>No milestones found for this project.</div>
        </div>
        <v-list v-else lines="two">
          <v-list-item
            v-for="milestone in milestones"
            :key="milestone.milestoneId"
            class="border-b"
          >
            <template #prepend>
               <v-avatar color="primary" variant="tonal" size="32">
                 <v-icon icon="mdi-flag" size="18" />
               </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ milestone.milestoneName }}
            </v-list-item-title>
            <v-list-item-subtitle>
              Due: {{ milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'No due date' }}
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex ga-1">
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  color="grey"
                  @click="openEdit(milestone)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="handleDelete(milestone.milestoneId)"
                />
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Create/Edit Modal -->
    <MilestoneModal
      v-model="showMilestoneModal"
      :milestone="editingMilestone"
      :project-id="projectId"
      @save="handleSaveMilestone"
    />
  </v-dialog>
</template>
