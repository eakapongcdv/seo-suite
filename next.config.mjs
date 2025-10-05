/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: 'loose',
    serverComponentsExternalPackages: [
      'lighthouse',
      'chrome-launcher',
      'playwright-core',   // ⬅️ ใส่เพิ่ม
      'playwright',        // (optional) ถ้าคุณลงตัวเต็ม
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3-alpha.figma.com" },
      { protocol: "https", hostname: "s3.figma.com" },
      { protocol: "https", hostname: "figma-alpha-api.s3.us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  webpack: (config) => {
    config.externals.push('electron'); // ตามที่คุณใส่ไว้ก่อนหน้า
    return config;
  },
};
export default nextConfig;
