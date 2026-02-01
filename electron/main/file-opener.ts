import { shell } from "electron";

export async function openFile(filePath: string): Promise<string> {
  return shell.openPath(filePath);
}

export function revealFile(filePath: string): void {
  shell.showItemInFolder(filePath);
}
