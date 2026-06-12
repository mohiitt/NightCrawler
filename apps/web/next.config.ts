import type { NextConfig } from "next";
import path from "path";

const contractsRoot = path.resolve(__dirname, "../../packages/contracts/src");

// Resolve the genui-sdk CSS file directly on disk so webpack doesn't enforce
// the package.json exports field (which omits ./dist/genui-sdk.css).
const genuiSdkCss = path.resolve(
  __dirname,
  "node_modules/@thesysai/genui-sdk/dist/genui-sdk.css"
);

const nextConfig: NextConfig = {
  transpilePackages: ["@nightcrawler/contracts"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    // Alias the genui-sdk CSS import path to the real file on disk,
    // bypassing the package exports restriction.
    (config.resolve.alias as Record<string, string>)[
      "@thesysai/genui-sdk/dist/genui-sdk.css"
    ] = genuiSdkCss;
    return config;
  },
  turbopack: {
    resolveAlias: {
      "./signal.js": path.join(contractsRoot, "signal.ts"),
      "./conspiracyBoard.js": path.join(contractsRoot, "conspiracyBoard.ts"),
      "./events.js": path.join(contractsRoot, "events.ts"),
      "./api.js": path.join(contractsRoot, "api.ts"),
    },
  },
};

export default nextConfig;
