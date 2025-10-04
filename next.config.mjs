/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: 'loose',
    // 👇 ให้ Next โหลดแพ็กเกจเหล่านี้แบบ external บนฝั่ง server (ไม่พยายาม bundle)
    serverComponentsExternalPackages: ['lighthouse', 'chrome-launcher'],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3-alpha.figma.com" },
      { protocol: "https", hostname: "s3.figma.com" },
      { protocol: "https", hostname: "figma-alpha-api.s3.us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};
export default nextConfig;
