import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { MakerZIP } from "@electron-forge/maker-zip";

const config: ForgeConfig = {
  packagerConfig: {
    name: "大师兄",
    executableName: "dashixiong",
    asar: true,
    icon: "./assets/icon",
    extraResource: ["../skills", "../memory", "../.pi/extensions"],
  },
  makers: [
    new MakerZIP({}, ["darwin"]),
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
