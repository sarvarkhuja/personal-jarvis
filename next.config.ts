import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      // Goals were merged into the "Goals & Habits" page at /habits.
      // Query strings (e.g. the retired ?status= filter) pass through and are ignored.
      {
        source: "/goals",
        destination: "/habits",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
