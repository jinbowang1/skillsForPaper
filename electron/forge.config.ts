import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Determine which tools to bundle based on target platform
function getExtraResources(): string[] {
  const base = [
    "../skills",
    "../memory",
    "../.pi/extensions",
    "./.env.bundled",
  ];

  // Check for cross-compilation target, fallback to current platform
  const targetPlatform = process.env.npm_config_platform || process.platform;

  if (targetPlatform === "win32") {
    base.push("./tools/win32");
  } else if (targetPlatform === "darwin") {
    base.push("./tools/darwin");
  }
  // Linux: no bundled tools for now (users install via package manager)

  return base;
}

const config: ForgeConfig = {
  packagerConfig: {
    name: "大师兄",
    executableName: "dashixiong",
    asar: false,
    icon: "./assets/icon",
    extraResource: getExtraResources(),
    osxSign: {
      identity: "Developer ID Application: jinbo wang (7P3NKWKF4K)",
      optionsForFile: () => ({
        entitlements: "./assets/entitlements.mac.plist",
        hardenedRuntime: true,
      }),
    },
    ...(process.env.APPLE_ID && process.env.APPLE_ID_PASSWORD && {
      osxNotarize: {
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_ID_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID || "7P3NKWKF4K",
      },
    }),
  },
  hooks: {
    postPackage: async (_config, options) => {
      // Install external dependencies into the packaged app
      const outputPath = options.outputPaths[0];
      const platform = options.platform;
      const arch = options.arch;
      const appPath = platform === "darwin"
        ? path.join(outputPath, "大师兄.app", "Contents", "Resources", "app")
        : path.join(outputPath, "resources", "app");

      console.log(`\nInstalling external dependencies for ${platform}/${arch} in ${appPath}...`);

      // Platform-specific clipboard package name and npm tarball URL
      const clipboardPackages: Record<string, { pkg: string; tarball: string }> = {
        "darwin-arm64": {
          pkg: "clipboard-darwin-arm64",
          tarball: "https://registry.npmjs.org/@mariozechner/clipboard-darwin-arm64/-/clipboard-darwin-arm64-0.3.2.tgz"
        },
        "darwin-x64": {
          pkg: "clipboard-darwin-x64",
          tarball: "https://registry.npmjs.org/@mariozechner/clipboard-darwin-x64/-/clipboard-darwin-x64-0.3.2.tgz"
        },
        "win32-x64": {
          pkg: "clipboard-win32-x64-msvc",
          tarball: "https://registry.npmjs.org/@mariozechner/clipboard-win32-x64-msvc/-/clipboard-win32-x64-msvc-0.3.2.tgz"
        },
        "win32-arm64": {
          pkg: "clipboard-win32-arm64-msvc",
          tarball: "https://registry.npmjs.org/@mariozechner/clipboard-win32-arm64-msvc/-/clipboard-win32-arm64-msvc-0.3.2.tgz"
        },
        "linux-x64": {
          pkg: "clipboard-linux-x64-gnu",
          tarball: "https://registry.npmjs.org/@mariozechner/clipboard-linux-x64-gnu/-/clipboard-linux-x64-gnu-0.3.2.tgz"
        },
        "linux-arm64": {
          pkg: "clipboard-linux-arm64-gnu",
          tarball: "https://registry.npmjs.org/@mariozechner/clipboard-linux-arm64-gnu/-/clipboard-linux-arm64-gnu-0.3.2.tgz"
        },
      };

      const clipboardInfo = clipboardPackages[`${platform}-${arch}`];

      const nodeModulesPath = path.join(appPath, "node_modules");
      fs.mkdirSync(nodeModulesPath, { recursive: true });

      // Create a minimal package.json for external deps (without clipboard - we'll download it separately)
      const externalDeps = {
        name: "dashixiong-externals",
        version: "1.0.0",
        dependencies: {
          "@mariozechner/pi-coding-agent": "^0.50.7",
          "@mariozechner/pi-ai": "^0.50.7",
          "node-record-lpcm16": "^1.0.1",
        }
      };

      const tempPkgPath = path.join(appPath, "externals-package.json");
      fs.writeFileSync(tempPkgPath, JSON.stringify(externalDeps, null, 2));

      try {
        // Install main dependencies (will install wrong platform clipboard, we'll fix later)
        execSync(`npm install --prefix "${appPath}" --package-lock=false --omit=dev`, {
          cwd: appPath,
          stdio: "inherit",
        });
        fs.unlinkSync(tempPkgPath);

        // Now fix the clipboard package for the target platform
        if (clipboardInfo) {
          const clipboardDir = path.join(nodeModulesPath, "@mariozechner");

          // Remove all clipboard-* platform packages (wrong platform ones installed by npm)
          if (fs.existsSync(clipboardDir)) {
            for (const entry of fs.readdirSync(clipboardDir)) {
              if (entry.startsWith("clipboard-")) {
                console.log(`Removing: @mariozechner/${entry}`);
                fs.rmSync(path.join(clipboardDir, entry), { recursive: true, force: true });
              }
            }
          }

          // Download and extract the correct platform package
          console.log(`Downloading ${clipboardInfo.pkg} for ${platform}/${arch}...`);
          const targetDir = path.join(clipboardDir, clipboardInfo.pkg);
          fs.mkdirSync(targetDir, { recursive: true });

          // Use curl to download and tar to extract
          execSync(`curl -sL "${clipboardInfo.tarball}" | tar -xz -C "${targetDir}" --strip-components=1`, {
            stdio: "inherit",
          });

          console.log(`Installed @mariozechner/${clipboardInfo.pkg}`);
        }
      } catch (e) {
        console.error("Failed to install external dependencies:", e);
      }

      console.log("External dependencies installed successfully.\n");

      // Re-sign the app bundle after adding external deps
      // (postPackage runs AFTER electron-packager's code signing,
      //  so newly installed node_modules break the sealed signature)
      if (platform === "darwin") {
        const appBundle = path.join(outputPath, "大师兄.app");
        const signIdentity = "Developer ID Application: jinbo wang (7P3NKWKF4K)";
        const entitlements = path.resolve(__dirname, "assets/entitlements.mac.plist");

        // Sign native .node binaries first (inside-out signing order)
        console.log("Signing native .node binaries...");
        const findResult = execSync(
          `find "${appBundle}/Contents/Resources/app/node_modules" -name "*.node" -type f`,
          { encoding: "utf-8" }
        ).trim();
        if (findResult) {
          for (const nodeFile of findResult.split("\n")) {
            console.log(`  Signing: ${path.basename(nodeFile)}`);
            execSync(
              `codesign --force --sign "${signIdentity}" --timestamp --options runtime --entitlements "${entitlements}" "${nodeFile}"`,
              { stdio: "inherit" }
            );
          }
        }

        // Re-sign the entire app bundle with entitlements
        console.log("Re-signing app bundle with entitlements...");
        execSync(
          `codesign --deep --force --sign "${signIdentity}" --timestamp --options runtime --entitlements "${entitlements}" "${appBundle}"`,
          { stdio: "inherit" }
        );
        console.log("App bundle re-signed successfully.\n");
      }
    },
  },
  makers: [
    new MakerZIP({}, ["darwin", "win32", "linux"]),
    new MakerDMG({ format: "ULFO" }),
    // MakerSquirrel requires Wine/Mono on macOS, skip for now
    // new MakerSquirrel({ name: "dashixiong" }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "main/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "preload/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
};

export default config;
