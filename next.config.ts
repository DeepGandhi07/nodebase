import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/",
        destination: "/workflows",
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "personal-trb",
  project: "nodebase",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",

  webpack: {
    automaticVercelMonitors: true,

    treeshake: {
      removeDebugLogging: true,
    },
  },
});
