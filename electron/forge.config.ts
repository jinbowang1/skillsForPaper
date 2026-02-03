import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";

const config: ForgeConfig = {
  packagerConfig: {
    name: "大师兄",
    executableName: "dashixiong",
    asar: true,
    icon: "./assets/icon",
    extraResource: ["../skills", "../memory", "../.pi/extensions", "./.env.bundled"],
  },
  makers: [
    new MakerZIP({}, ["darwin", "win32", "linux"]),
    new MakerDMG({ format: "ULFO" }),
    new MakerSquirrel({ name: "dashixiong" }),
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
