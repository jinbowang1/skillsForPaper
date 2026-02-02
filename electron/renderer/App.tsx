import React, { useEffect } from "react";
import Bookshelf from "./components/bookshelf/Bookshelf";
import ChatArea from "./components/chat/ChatArea";
import { useAgentEvents } from "./hooks/useAgentEvents";
import { useBookshelf } from "./hooks/useBookshelf";
import { useTaskProgress } from "./hooks/useTaskProgress";
import { useUserStore } from "./stores/user-store";

export default function App() {
  // Initialize all IPC subscriptions
  useAgentEvents();
  useBookshelf();
  useTaskProgress();

  // Fetch user info from memory on mount
  useEffect(() => {
    useUserStore.getState().fetchUserInfo();
  }, []);

  return (
    <div className="app">
      <Bookshelf />
      <ChatArea />
    </div>
  );
}
