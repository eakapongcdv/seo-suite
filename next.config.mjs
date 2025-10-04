/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { esmExternals: 'loose' },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3-alpha.figma.com" },
      { protocol: "https", hostname: "s3.figma.com" },
      { protocol: "https", hostname: "figma-alpha-api.s3.us-west-2.amazonaws.com" },
    ],
  },
};
export default nextConfig;
