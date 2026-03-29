/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    PORT: process.env.PORT || "3000",
  },
};

module.exports = nextConfig;
