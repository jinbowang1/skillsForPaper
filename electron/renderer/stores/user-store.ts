import { create } from "zustand";

interface UserInfo {
  name: string;
  identity: string;
  institution: string;
  researchField: string;
  advisor: string;
  project: string;
}

interface UserState {
  userInfo: UserInfo | null;
  userName: string;
  userInitial: string;
  aiName: string;
  loaded: boolean;
  fetchUserInfo: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  userInfo: null,
  userName: "用户",
  userInitial: "用",
  aiName: "大师兄",
  loaded: false,

  fetchUserInfo: async () => {
    if (get().loaded) return;
    try {
      const info: UserInfo = await window.api.getUserInfo();
      const name = info.name || "用户";
      set({
        userInfo: info,
        userName: name,
        userInitial: name.charAt(0),
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));
