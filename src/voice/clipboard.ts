import { execSync } from "child_process";

export function copyToClipboard(text: string): boolean {
  try {
    let cmd: string;
    switch (process.platform) {
      case "win32":
        cmd = "clip";
        break;
      case "darwin":
        cmd = "pbcopy";
        break;
      default:
        cmd = "xclip -selection clipboard";
        break;
    }
    execSync(cmd, { input: text, encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}
