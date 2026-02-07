/**
 * Bundled Tools Manager
 *
 * Manages portable tools (bash, python, sox) bundled with the app.
 * Sets up PATH environment variable to include bundled tools so that
 * the pi-coding-agent SDK can find them without requiring system installation.
 */

import * as path from "path";
import * as fs from "fs";
import { app } from "electron";

const IS_PACKAGED = app.isPackaged;

interface BundledToolPaths {
  git?: string;      // Git with bash (Windows only)
  python?: string;   // Python executable directory
  sox?: string;      // SoX audio tool directory
}

/**
 * Get paths to bundled tools based on platform
 */
function getBundledToolPaths(): BundledToolPaths {
  if (!IS_PACKAGED) {
    return {}; // In dev mode, use system tools
  }

  const resourcesPath = process.resourcesPath;
  const platform = process.platform;
  const paths: BundledToolPaths = {};

  if (platform === "win32") {
    // Windows bundled tools
    const win32Tools = path.join(resourcesPath, "win32");

    // Git (provides bash via git-bash)
    const gitPath = path.join(win32Tools, "git");
    if (fs.existsSync(path.join(gitPath, "cmd", "git.exe"))) {
      paths.git = gitPath;
    }

    // Python
    const pythonPath = path.join(win32Tools, "python");
    if (fs.existsSync(path.join(pythonPath, "python.exe"))) {
      paths.python = pythonPath;
    }

    // SoX
    const soxPath = path.join(win32Tools, "sox");
    if (fs.existsSync(path.join(soxPath, "sox.exe"))) {
      paths.sox = soxPath;
    }
  } else if (platform === "darwin") {
    // macOS bundled tools
    const darwinTools = path.join(resourcesPath, "darwin");

    // Python standalone
    const pythonPath = path.join(darwinTools, "python", "bin");
    if (fs.existsSync(path.join(pythonPath, "python3"))) {
      paths.python = pythonPath;
    }

    // Note: macOS has bash built-in, no need to bundle
    // SoX on macOS requires brew install, or we can bundle it later
  }

  return paths;
}

/**
 * Setup environment variables for bundled tools
 * This modifies process.env.PATH to include bundled tool directories
 */
export function setupBundledToolsEnv(): void {
  const toolPaths = getBundledToolPaths();
  const pathsToAdd: string[] = [];

  if (toolPaths.git) {
    // Add git cmd and usr/bin for bash
    pathsToAdd.push(path.join(toolPaths.git, "cmd"));
    pathsToAdd.push(path.join(toolPaths.git, "usr", "bin"));
    pathsToAdd.push(path.join(toolPaths.git, "mingw64", "bin"));
  }

  if (toolPaths.python) {
    pathsToAdd.push(toolPaths.python);
  }

  if (toolPaths.sox) {
    pathsToAdd.push(toolPaths.sox);
  }

  if (pathsToAdd.length > 0) {
    const separator = process.platform === "win32" ? ";" : ":";
    const currentPath = process.env.PATH || "";

    // Prepend bundled tools to PATH so they take priority
    process.env.PATH = pathsToAdd.join(separator) + separator + currentPath;

    console.log("[bundled-tools] Added to PATH:", pathsToAdd);
  }
}

/**
 * Get the bundled shell executable path (Windows only)
 * Uses sh.exe from MinGit (compatible with most bash scripts)
 * Returns undefined if not available
 */
export function getBundledBashPath(): string | undefined {
  if (process.platform !== "win32" || !IS_PACKAGED) {
    return undefined;
  }

  const toolPaths = getBundledToolPaths();
  if (toolPaths.git) {
    // MinGit provides sh.exe which is compatible with most bash scripts
    const shPath = path.join(toolPaths.git, "usr", "bin", "sh.exe");
    if (fs.existsSync(shPath)) {
      return shPath;
    }
  }
  return undefined;
}

/**
 * Get the bundled Python executable path
 * Returns undefined if not available
 */
export function getBundledPythonPath(): string | undefined {
  if (!IS_PACKAGED) {
    return undefined;
  }

  const toolPaths = getBundledToolPaths();
  if (toolPaths.python) {
    const pythonExe = process.platform === "win32" ? "python.exe" : "python3";
    const pythonPath = path.join(toolPaths.python, pythonExe);
    if (fs.existsSync(pythonPath)) {
      return pythonPath;
    }
  }
  return undefined;
}

/**
 * Get the bundled SoX executable directory (Windows only)
 * Returns undefined if not available
 */
export function getBundledSoxPath(): string | undefined {
  if (process.platform !== "win32" || !IS_PACKAGED) {
    return undefined;
  }

  const toolPaths = getBundledToolPaths();
  return toolPaths.sox;
}

/**
 * Check which bundled tools are available
 */
export function checkBundledTools(): { bash: boolean; python: boolean; sox: boolean } {
  const paths = getBundledToolPaths();

  return {
    bash: process.platform !== "win32" || !!paths.git, // macOS/Linux have bash built-in
    python: !!paths.python,
    sox: !!paths.sox || process.platform !== "win32", // Windows: check bundled; others: assume system
  };
}

/**
 * Get diagnostic info about bundled tools
 */
export function getBundledToolsInfo(): string {
  if (!IS_PACKAGED) {
    return "Running in development mode - using system tools";
  }

  const paths = getBundledToolPaths();
  const checks = checkBundledTools();
  const lines: string[] = [
    `Platform: ${process.platform}`,
    `Resources: ${process.resourcesPath}`,
    "",
    "Bundled Tools Status:",
    `  Bash: ${checks.bash ? "✓ Available" : "✗ Not found"}${paths.git ? ` (${paths.git})` : ""}`,
    `  Python: ${checks.python ? "✓ Available" : "✗ Not found"}${paths.python ? ` (${paths.python})` : ""}`,
    `  SoX: ${checks.sox ? "✓ Available" : "✗ Not found"}${paths.sox ? ` (${paths.sox})` : ""}`,
  ];

  return lines.join("\n");
}
