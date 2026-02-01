/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

module.exports = nextConfig
