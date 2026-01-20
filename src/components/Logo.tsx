const Logo = ({ className = "h-10 sm:h-12" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Wheel/Pinwheel Icon SVG - 6 curved rays */}
      <svg 
        viewBox="0 0 100 100" 
        className="h-full w-auto"
        fill="currentColor"
      >
        {/* Center circle */}
        <circle cx="50" cy="50" r="8" />
        
        {/* 6 curved rays radiating from center */}
        {/* Ray 1 - Top */}
        <path d="M 50 42 Q 45 25, 50 8 Q 55 25, 50 42 Z" />
        
        {/* Ray 2 - Top Right */}
        <path d="M 56 45 Q 67 32, 79 21 Q 70 36, 56 45 Z" />
        
        {/* Ray 3 - Bottom Right */}
        <path d="M 56 55 Q 67 68, 79 79 Q 70 64, 56 55 Z" />
        
        {/* Ray 4 - Bottom */}
        <path d="M 50 58 Q 55 75, 50 92 Q 45 75, 50 58 Z" />
        
        {/* Ray 5 - Bottom Left */}
        <path d="M 44 55 Q 33 68, 21 79 Q 30 64, 44 55 Z" />
        
        {/* Ray 6 - Top Left */}
        <path d="M 44 45 Q 33 32, 21 21 Q 30 36, 44 45 Z" />
      </svg>
      
      {/* 5THVITAL Text */}
      <span className="text-2xl sm:text-3xl font-bold tracking-tight">
        5THVITAL
      </span>
    </div>
  );
};

export default Logo;
