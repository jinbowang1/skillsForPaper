import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/bookshelf.css";
import "./styles/chat.css";
import "./styles/cards.css";
import "./styles/animations.css";
import "./styles/setup.css";

// Catch unhandled promise rejections globally (prevents silent failures)
window.addEventListener("unhandledrejection", (e) => {
  console.error("[unhandledrejection]", e.reason);
  e.preventDefault();
});

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
