import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader:false,
  compress:true,
  experimental:{optimizePackageImports:["lucide-react"]},
  async headers(){return[{source:"/:path*",headers:[{key:"Strict-Transport-Security",value:"max-age=63072000; includeSubDomains; preload"},{key:"X-DNS-Prefetch-Control",value:"on"}]}]},
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
