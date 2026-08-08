/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  async redirects() {
    return [
      // CULTSCAN lived at /cultscan before it took over the root. Keep the old
      // path working so any link already in the wild still lands.
      { source: '/cultscan', destination: '/', permanent: true },
    ]
  },
}

module.exports = nextConfig
