import React from "react";

/**
 * On Windows, native window controls are provided by Electron's titleBarOverlay.
 * This component is kept as a no-op for compatibility.
 */
export default function WindowControls() {
  return null;
}
