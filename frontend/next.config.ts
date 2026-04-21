import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'export',  // Enable static export for S3 hosting
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: true,  // Required for static export
  },
  trailingSlash: true,  // Better compatibility with S3
};

export default nextConfig;
