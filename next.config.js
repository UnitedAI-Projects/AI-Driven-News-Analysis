/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/analyze", destination: "/", permanent: false }];
  },
};

module.exports = nextConfig;
