import { create } from "zustand";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable
  }
  return "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage unavailable
  }
}

// Apply theme immediately on module load (before React mounts, avoids flash)
applyTheme(getInitialTheme());

// Set platform attribute on <html> for CSS platform selectors
if (window.api?.platform) {
  document.documentElement.setAttribute("data-platform", window.api.platform);
}

type PanelType = "profile" | "guide" | "faq" | "account" | "settings";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  activePanel: PanelType | null;
  openPanel: (panel: PanelType) => void;
  closePanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  theme: getInitialTheme(),
  setTheme: (theme: Theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      return { theme: next };
    }),

  activePanel: null,
  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
}));
