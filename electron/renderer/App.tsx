import React, { useEffect, useState } from "react";
import Bookshelf from "./components/bookshelf/Bookshelf";
import ChatArea from "./components/chat/ChatArea";
import SetupWizard from "./components/SetupWizard";
import { useAgentEvents } from "./hooks/useAgentEvents";
import { useBookshelf } from "./hooks/useBookshelf";
import { useTaskProgress } from "./hooks/useTaskProgress";
import { useUserStore } from "./stores/user-store";

export default function App() {
  const [setupRequired, setSetupRequired] = useState(false);

  // Listen for setup:required from main process
  useEffect(() => {
    return window.api.onSetupRequired(() => setSetupRequired(true));
  }, []);

  // Initialize all IPC subscriptions
  useAgentEvents();
  useBookshelf();
  useTaskProgress();

  // Fetch user info from memory on mount
  useEffect(() => {
    useUserStore.getState().fetchUserInfo();
  }, []);

  if (setupRequired) {
    return <SetupWizard onComplete={() => setSetupRequired(false)} />;
  }

  return (
    <div className="app">
      <Bookshelf />
      <ChatArea />
    </div>
  );
}
