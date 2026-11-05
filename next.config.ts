import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The client billing UI was consolidated from /billing into /subscription.
  // Keep the old paths working for bookmarks and any links already in the wild.
  async redirects() {
    return [
      { source: '/billing', destination: '/subscription', permanent: false },
      { source: '/billing/upgrade', destination: '/subscription/plan', permanent: false },
      { source: '/billing/invoices', destination: '/subscription/invoices', permanent: false },
      // /billing/assets covered per-asset subscriptions, whose backend tables
      // were dropped — send it to the subscription overview rather than 404.
      { source: '/billing/:path*', destination: '/subscription', permanent: false },
      // The Fuel tab was removed from Analytics; fuel lives under /fuel.
      { source: '/analytics/fuel', destination: '/fuel', permanent: false },
      // The old Fuel Center sidebar shell and its Live Monitor and Reports pages were removed.
      { source: '/fuel/monitor', destination: '/fuel/realtime', permanent: false },
      { source: '/fuel/reports', destination: '/fuel/by-source', permanent: false },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
