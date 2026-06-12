import type { NextConfig } from "next";
import path from "path";

const contractsRoot = path.resolve(__dirname, "../../packages/contracts/src");

const nextConfig: NextConfig = {
  transpilePackages: ["@nightcrawler/contracts"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
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
