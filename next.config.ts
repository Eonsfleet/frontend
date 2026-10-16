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
