/** @type {import('next').NextConfig} */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://telegram.org",
  "frame-src https://oauth.telegram.org",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? ""}`,
  "frame-ancestors 'self' https://web.telegram.org",
].join("; ");
export default {
  output: "standalone",
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  async headers() { return [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: csp }] }]; },
};
