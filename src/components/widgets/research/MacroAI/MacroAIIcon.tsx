interface MacroAIIconProps {
  className?: string;
}

export function MacroAIIcon({ className = "w-4 h-4" }: MacroAIIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer hexagon structure with interlocking geometric lines */}
      <path
        d="M50 10 L80 27.5 L80 62.5 L50 80 L20 62.5 L20 27.5 Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Top-left diagonal */}
      <path
        d="M20 27.5 L35 45 L50 37.5"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Top-right diagonal */}
      <path
        d="M50 10 L50 37.5 L65 45"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Middle horizontal */}
      <path
        d="M35 45 L65 45"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Bottom-left diagonal */}
      <path
        d="M35 55 L50 62.5 L50 80"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Bottom-right diagonal */}
      <path
        d="M80 62.5 L65 55 L50 62.5"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Right vertical */}
      <path
        d="M65 45 L65 55 L80 62.5"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Left vertical */}
      <path
        d="M20 27.5 L35 55"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Top connection */}
      <path
        d="M80 27.5 L65 45"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
