import { useEffect } from "react";
import { useBookshelfStore } from "../stores/bookshelf-store";

export function useBookshelf() {
  const setItems = useBookshelfStore((s) => s.setItems);

  useEffect(() => {
    // Initial load
    window.api.getBookshelfItems().then(setItems);

    // Listen for updates
    const unsub = window.api.onBookshelfUpdate(setItems);
    return unsub;
  }, [setItems]);
}
