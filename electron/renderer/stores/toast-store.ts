import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

let toastId = 0;

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  show: (message: string, type?: Toast["type"]) => void;  // Alias for addToast
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message, type = "error") => {
    const id = `toast-${++toastId}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  // Alias for addToast - more intuitive naming
  show: (message, type = "error") => {
    get().addToast(message, type);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
