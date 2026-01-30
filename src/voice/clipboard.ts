import { execSync } from "child_process";

export function copyToClipboard(text: string): boolean {
  try {
    execSync("pbcopy", { input: text, encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}
