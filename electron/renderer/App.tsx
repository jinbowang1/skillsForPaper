import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import Bookshelf from "./components/bookshelf/Bookshelf";
import ChatArea from "./components/chat/ChatArea";
import SetupWizard from "./components/SetupWizard";
import Onboarding from "./components/Onboarding";
import ToastContainer from "./components/ToastContainer";
import { useAgentEvents } from "./hooks/useAgentEvents";
import { useBookshelf } from "./hooks/useBookshelf";
import { useTaskProgress } from "./hooks/useTaskProgress";
import { useChatPersistence } from "./hooks/useChatPersistence";
import { useUserStore } from "./stores/user-store";
import { useSessionStore } from "./stores/session-store";

interface UpdateInfo {
  version: string;
  downloadUrl: string;
}

function getOnboardingSeen(): boolean {
  try {
    return localStorage.getItem("onboarding_seen") === "1";
  } catch {
    return false;
  }
}

function markOnboardingSeen() {
  try {
    localStorage.setItem("onboarding_seen", "1");
  } catch {
    // ignore
  }
}

export default function App() {
  const [setupRequired, setSetupRequired] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(!getOnboardingSeen());
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Listen for setup:required from main process
  useEffect(() => {
    return window.api.onSetupRequired(() => setSetupRequired(true));
  }, []);

  // Listen for update:available
  useEffect(() => {
    return window.api.onUpdateAvailable((info) => setUpdateInfo(info));
  }, []);

  // Initialize all IPC subscriptions
  useAgentEvents();
  useBookshelf();
  useTaskProgress();
  useChatPersistence();

  // Fetch user info and avatar from memory on mount
  useEffect(() => {
    useUserStore.getState().fetchUserInfo();
    useUserStore.getState().fetchAvatar();
  }, []);

  // Fetch current model from session on mount (with retry for slow startup)
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 5;
    const retryDelay = 1000;

    const fetchModel = () => {
      window.api.getState().then((state) => {
        if (state?.model && state.model !== "unknown") {
          useSessionStore.getState().setModel(state.model);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(fetchModel, retryDelay);
        } else {
          // Fallback: try to get first model from list
          window.api.getModels().then((models) => {
            if (models.length > 0) {
              useSessionStore.getState().setModel(models[0].name);
            }
          }).catch(() => {});
        }
      }).catch(() => {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(fetchModel, retryDelay);
        }
      });
    };

    fetchModel();
  }, []);

  if (setupRequired) {
    return <SetupWizard onComplete={() => setSetupRequired(false)} />;
  }

  return (
    <div className="app">
      {updateInfo && (
        <div className="update-banner">
          <Download size={14} />
          <span>新版本 v{updateInfo.version} 可用</span>
          <button
            className="update-btn"
            onClick={() => window.api.openUpdateUrl(updateInfo.downloadUrl)}
          >
            下载更新
          </button>
          <button
            className="update-dismiss"
            onClick={() => setUpdateInfo(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <Bookshelf />
      <ChatArea />
      <ToastContainer />
      {showOnboarding && (
        <Onboarding onComplete={() => { markOnboardingSeen(); setShowOnboarding(false); }} />
      )}
    </div>
  );
}
