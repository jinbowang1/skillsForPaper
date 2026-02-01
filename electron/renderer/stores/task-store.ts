import { create } from "zustand";
import type { TaskState } from "../../preload/api";

interface TaskStoreState {
  task: TaskState | null;
  setTask: (task: TaskState | null) => void;
}

export const useTaskStore = create<TaskStoreState>((set) => ({
  task: null,
  setTask: (task) => set({ task }),
}));
