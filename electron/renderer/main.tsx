import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/bookshelf.css";
import "./styles/chat.css";
import "./styles/cards.css";
import "./styles/animations.css";
import "./styles/setup.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
