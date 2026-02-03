import { app, BrowserWindow, shell } from "electron";
import https from "https";

const GITHUB_OWNER = "jinbowang1";
const GITHUB_REPO = "skillsForPaper";
const CHECK_DELAY = 30 * 1000; // 30s after launch
const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // every 4 hours

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface ReleaseInfo {
  tag_name: string;
  html_url: string;
  body: string;
  assets: ReleaseAsset[];
}

export interface UpdateAvailable {
  version: string;
  releaseUrl: string;
  downloadUrl: string;
  releaseNotes: string;
}

let updateWindow: BrowserWindow | null = null;

export function initAutoUpdater(window: BrowserWindow) {
  updateWindow = window;
  setTimeout(() => checkForUpdate(), CHECK_DELAY);
  setInterval(() => checkForUpdate(), CHECK_INTERVAL);
}

async function checkForUpdate() {
  if (!updateWindow || updateWindow.isDestroyed()) return;

  try {
    const release = await fetchLatestRelease();
    if (!release) return;

    const latest = release.tag_name.replace(/^v/, "");
    const current = app.getVersion();

    if (isNewer(latest, current)) {
      const asset = getPlatformAsset(release.assets);
      updateWindow.webContents.send("update:available", {
        version: latest,
        releaseUrl: release.html_url,
        downloadUrl: asset?.browser_download_url || release.html_url,
        releaseNotes: release.body || "",
      } satisfies UpdateAvailable);
      console.log(`[updater] New version available: ${latest} (current: ${current})`);
    } else {
      console.log(`[updater] Up to date (${current})`);
    }
  } catch (err) {
    console.log("[updater] Check failed:", err);
  }
}

function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: "api.github.com",
        path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        headers: { "User-Agent": "dashixiong-updater" },
      },
      (res) => {
        // No releases yet → 404
        if (res.statusCode === 404) {
          resolve(null);
          return;
        }
        // Follow redirect
        if (res.statusCode === 301 || res.statusCode === 302) {
          resolve(null);
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

/** Simple semver comparison: returns true if latest > current */
function isNewer(latest: string, current: string): boolean {
  const l = latest.split(".").map(Number);
  const c = current.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const lv = l[i] || 0;
    const cv = c[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

/** Find the download asset matching the current platform */
function getPlatformAsset(assets: ReleaseAsset[]): ReleaseAsset | undefined {
  const platform = process.platform;
  if (platform === "darwin") {
    return (
      assets.find((a) => a.name.endsWith(".dmg")) ||
      assets.find((a) => a.name.endsWith(".zip") && a.name.toLowerCase().includes("darwin"))
    );
  } else if (platform === "win32") {
    return (
      assets.find((a) => a.name.endsWith(".exe")) ||
      assets.find((a) => a.name.toLowerCase().includes("setup"))
    );
  }
  return undefined;
}

export async function openReleaseUrl(url: string) {
  await shell.openExternal(url);
}
