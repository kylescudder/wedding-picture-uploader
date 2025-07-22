import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: `xgxwpeak3r.ufs.sh`,
        pathname: '/f/*'
      }
    ]
  }
}

export default nextConfig
