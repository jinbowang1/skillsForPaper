/**
 * React hook for chat history persistence.
 *
 * - Loads chat history on app startup
 * - Saves chat history when messages change (debounced, not during streaming)
 */

import { useEffect, useRef } from "react";
import { useSessionStore } from "../stores/session-store";

export function useChatPersistence() {
  const messages = useSessionStore((state) => state.messages);
  const isStreaming = useSessionStore((state) => state.isStreaming);
  const currentModel = useSessionStore((state) => state.currentModel);
  const addMessage = useSessionStore((state) => state.addMessage);
  const setModel = useSessionStore((state) => state.setModel);

  const hasLoadedRef = useRef(false);
  const lastSavedRef = useRef<string>("");

  // Load history on mount (only once)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    (async () => {
      try {
        const result = await window.api.loadChatHistory();
        if (result && result.messages && result.messages.length > 0) {
          // Add messages one by one to maintain order
          for (const msg of result.messages) {
            addMessage(msg);
          }
          // Restore model if saved
          if (result.model) {
            setModel(result.model);
          }
          console.log(`[useChatPersistence] Loaded ${result.messages.length} messages`);
        }
      } catch (err) {
        console.error("[useChatPersistence] Failed to load history:", err);
      }
    })();
  }, [addMessage, setModel]);

  // Save when messages change (but not during streaming)
  useEffect(() => {
    // Don't save during streaming - wait for it to complete
    if (isStreaming) return;

    // Don't save if no messages
    if (messages.length === 0) return;

    // Compute a simple hash to avoid unnecessary saves
    const hash = JSON.stringify(messages.map((m) => m.id + m.blocks.length));
    if (hash === lastSavedRef.current) return;
    lastSavedRef.current = hash;

    // Save to main process (debouncing happens there)
    window.api.saveChatHistory(messages, currentModel).catch((err: any) => {
      console.error("[useChatPersistence] Failed to save:", err);
    });
  }, [messages, isStreaming, currentModel]);
}
