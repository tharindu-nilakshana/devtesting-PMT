import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Enable standalone output for deployment (production only)
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
    // Disable TypeScript checking during build
    typescript: {
      ignoreBuildErrors: true,
  },

  // Image configuration for external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'frontendapi.primemarket-terminal.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'pmt_frontend_api_dev',
        port: '3000',
        pathname: '/**',
      },
    ],
  },
  
  // AmCharts 5 configuration
  webpack: (config, { }) => {
    // Handle AmCharts 5 modules - remove alias that might interfere with submodules
    // Allow normal module resolution for AmCharts
    
    
    return config;
  },
  
  // Add compression and caching headers for better performance
  async headers() {
    return [
      {
        // Cache TradingView charting library files for 1 year
        source: '/charting_library/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Enable compression for JS and CSS files
        source: '/:path*.(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

};

export default nextConfig;