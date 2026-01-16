import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.resolve(process.cwd()),
  },
} as NextConfig;

export default nextConfig;
