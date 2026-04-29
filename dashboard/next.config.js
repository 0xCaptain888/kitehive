/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export: run `STATIC_EXPORT=1 npm run build` for GitHub Pages
  ...(process.env.STATIC_EXPORT === '1' ? { output: 'export', images: { unoptimized: true } } : {}),
};

module.exports = nextConfig;
