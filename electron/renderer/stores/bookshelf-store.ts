import { create } from "zustand";
import type { BookshelfItem } from "../../preload/api";

interface BookshelfState {
  items: BookshelfItem[];
  setItems: (items: BookshelfItem[]) => void;
}

export const useBookshelfStore = create<BookshelfState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}));
