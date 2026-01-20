import Image from 'next/image';

interface PMTLogoProps {
  theme?: 'dark' | 'light';
}

export function PMTLogo({ theme }: PMTLogoProps) {
  return (
    <Image 
      src={theme === 'light' ? '/logo_white.png' : '/logo.png'}
      alt="PMT Logo" 
      width={110}
      height={12}
      className="h-[12px] w-auto object-contain"
      priority
    />
  );
}

