/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontSize: {
        // Reduce all font sizes by 2 points
        'xs': ['10px', { lineHeight: '14px' }],      // was 12px
        'sm': ['12px', { lineHeight: '16px' }],      // was 14px
        'base': ['14px', { lineHeight: '20px' }],    // was 16px
        'lg': ['16px', { lineHeight: '24px' }],      // was 18px
        'xl': ['18px', { lineHeight: '28px' }],      // was 20px
        '2xl': ['20px', { lineHeight: '32px' }],     // was 24px
        '3xl': ['22px', { lineHeight: '36px' }],     // was 30px
        '4xl': ['24px', { lineHeight: '40px' }],     // was 36px
        '5xl': ['28px', { lineHeight: '44px' }],     // was 48px
        '6xl': ['32px', { lineHeight: '48px' }],     // was 60px
        '7xl': ['36px', { lineHeight: '52px' }],     // was 72px
        '8xl': ['40px', { lineHeight: '56px' }],     // was 96px
        '9xl': ['44px', { lineHeight: '60px' }],     // was 128px
      },
      spacing: {
        // Also reduce some spacing that might be too large with smaller fonts
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '28': '112px',
        '32': '128px',
        '36': '144px',
        '40': '160px',
        '44': '176px',
        '48': '192px',
        '52': '208px',
        '56': '224px',
        '60': '240px',
        '64': '256px',
        '72': '288px',
        '80': '320px',
        '96': '384px',
      }
    },
  },
  plugins: [],
}

export default config
