/**
 * Health Check Module
 *
 * Performs startup health checks for:
 * - System permissions (microphone, disk access)
 * - Bundled tools (Python, Bash, SoX)
 * - Network connectivity
 */

import { systemPreferences, app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { checkBundledTools, getBundledToolsInfo } from "./bundled-tools.js";

export interface PermissionStatus {
  microphone: "granted" | "denied" | "not-determined" | "restricted" | "unknown";
  disk: "ok" | "error";
}

export interface ToolStatus {
  python: boolean;
  bash: boolean;
  sox: boolean;
}

export interface NetworkStatus {
  connected: boolean;
  error?: string;
}

export interface HealthCheckResult {
  permissions: PermissionStatus;
  tools: ToolStatus;
  network: NetworkStatus;
  allGood: boolean;
}

/**
 * Check microphone permission status
 */
export function getMicrophonePermission(): PermissionStatus["microphone"] {
  if (process.platform === "darwin") {
    try {
      const status = systemPreferences.getMediaAccessStatus("microphone");
      return status as PermissionStatus["microphone"];
    } catch {
      return "unknown";
    }
  } else if (process.platform === "win32") {
    // Windows doesn't have a simple API to check, assume granted
    // Permission dialog will show when actually accessing microphone
    return "granted";
  }
  return "unknown";
}

/**
 * Request microphone permission (macOS only)
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (process.platform === "darwin") {
    try {
      return await systemPreferences.askForMediaAccess("microphone");
    } catch {
      return false;
    }
  }
  // Windows/Linux: permission is granted when user allows in system dialog
  return true;
}

/**
 * Check if we have write access to the user data directory
 */
export function checkDiskAccess(): PermissionStatus["disk"] {
  try {
    const testDir = app.getPath("userData");
    const testFile = path.join(testDir, ".write-test");

    // Try to write a test file
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);

    return "ok";
  } catch {
    return "error";
  }
}

/**
 * Check if bundled tools are available
 */
export function checkTools(): ToolStatus {
  const bundled = checkBundledTools();

  // Also check if tools are actually executable
  const tools: ToolStatus = {
    python: bundled.python,
    bash: bundled.bash,
    sox: bundled.sox,
  };

  // For development mode, check system tools
  if (!app.isPackaged) {
    try {
      if (process.platform === "win32") {
        execSync("where python", { stdio: "ignore" });
      } else {
        execSync("which python3 || which python", { stdio: "ignore" });
      }
      tools.python = true;
    } catch {
      tools.python = false;
    }

    try {
      if (process.platform === "win32") {
        execSync("where bash || where sh", { stdio: "ignore" });
      } else {
        execSync("which bash", { stdio: "ignore" });
      }
      tools.bash = true;
    } catch {
      tools.bash = false;
    }

    try {
      if (process.platform === "win32") {
        execSync("where sox", { stdio: "ignore" });
      } else {
        execSync("which sox || which rec", { stdio: "ignore" });
      }
      tools.sox = true;
    } catch {
      tools.sox = false;
    }
  }

  return tools;
}

/**
 * Check network connectivity by pinging a known endpoint
 */
export async function checkNetwork(): Promise<NetworkStatus> {
  try {
    // Try to reach a reliable endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://api.anthropic.com", {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return { connected: true };
  } catch (err: any) {
    // Also try a Chinese endpoint as backup
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      await fetch("https://dashscope.aliyuncs.com", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return { connected: true };
    } catch {
      return {
        connected: false,
        error: err.message || "Network unreachable",
      };
    }
  }
}

/**
 * Perform full health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const micPermission = getMicrophonePermission();
  const diskAccess = checkDiskAccess();
  const tools = checkTools();
  const network = await checkNetwork();

  const permissions: PermissionStatus = {
    microphone: micPermission,
    disk: diskAccess,
  };

  // Determine if everything is good
  // Microphone is optional (only needed for voice input)
  // SoX is optional (only needed for voice input)
  const allGood =
    diskAccess === "ok" &&
    tools.python &&
    tools.bash &&
    network.connected;

  return {
    permissions,
    tools,
    network,
    allGood,
  };
}

/**
 * Get human-readable status message
 */
export function getHealthCheckMessage(result: HealthCheckResult): string {
  const lines: string[] = [];

  // Permissions
  if (result.permissions.microphone === "denied") {
    lines.push("⚠️ 麦克风权限被拒绝，语音功能将不可用");
  } else if (result.permissions.microphone === "not-determined") {
    lines.push("ℹ️ 首次使用语音功能时会请求麦克风权限");
  }

  if (result.permissions.disk === "error") {
    lines.push("❌ 无法写入应用数据目录");
  }

  // Tools
  if (!result.tools.python) {
    lines.push("⚠️ Python 不可用，部分功能可能受限");
  }
  if (!result.tools.bash) {
    lines.push("❌ Shell 不可用，代码执行功能将受限");
  }
  if (!result.tools.sox) {
    lines.push("ℹ️ SoX 不可用，语音功能将不可用");
  }

  // Network
  if (!result.network.connected) {
    lines.push("❌ 网络连接失败: " + (result.network.error || "请检查网络设置"));
  }

  if (lines.length === 0) {
    return "✅ 所有检查通过";
  }

  return lines.join("\n");
}
