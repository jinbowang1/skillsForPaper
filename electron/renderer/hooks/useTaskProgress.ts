import { useEffect } from "react";
import { useTaskStore } from "../stores/task-store";

export function useTaskProgress() {
  const setTask = useTaskStore((s) => s.setTask);

  useEffect(() => {
    // Initial load
    window.api.getTaskState().then(setTask).catch(() => {});

    // Listen for updates
    const unsub = window.api.onTaskUpdate(setTask);
    return unsub;
  }, [setTask]);
}
