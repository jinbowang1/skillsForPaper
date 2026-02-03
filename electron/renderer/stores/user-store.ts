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
  avatarUrl: string | null;
  fetchUserInfo: () => Promise<void>;
  fetchAvatar: () => Promise<void>;
  updateUserInfo: (info: UserInfo) => Promise<boolean>;
}

export const useUserStore = create<UserState>((set, get) => ({
  userInfo: null,
  userName: "用户",
  userInitial: "用",
  aiName: "大师兄",
  loaded: false,
  avatarUrl: null,

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

  fetchAvatar: async () => {
    try {
      const url = await window.api.getAvatar();
      set({ avatarUrl: url });
    } catch {
      // ignore
    }
  },

  updateUserInfo: async (info: UserInfo) => {
    try {
      const result = await window.api.updateUserInfo(info);
      if (result.ok) {
        const name = info.name || "用户";
        set({
          userInfo: info,
          userName: name,
          userInitial: name.charAt(0),
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
