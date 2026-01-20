import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ctaSunsetBg from "@/assets/cta-sunset-bg.jpg";

const CallToActionSection = () => {
  const navigate = useNavigate();

  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Fixed-like background layer (no flicker) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-screen w-full">
          <img
            src={ctaSunsetBg}
            alt="5thvital book now background"
            className="h-full w-full object-cover will-change-transform transform-gpu"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 via-purple-600/40 to-orange-800/50" />
        </div>
      </div>
      
      {/* Platform Label */}
      <div className="absolute top-16 sm:top-20 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white"></div>
            <div className="w-1 h-2 sm:h-3 bg-white"></div>
            <div className="w-1 h-2 sm:h-3 bg-white"></div>
          </div>
          <div className="text-xs sm:text-sm font-mono text-white tracking-wider font-semibold">
            BOOK NOW
          </div>
        </div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 md:mb-8 leading-tight drop-shadow-2xl">
          Talk to our agent, book a test, or build a 
          <br className="hidden sm:block" />
          <span className="text-white/95">customised health check package for yourself</span>
        </h2>
        
        <button 
          onClick={() => {
            navigate('/booking');
            // Scroll to hero section after navigation
            setTimeout(() => {
              const heroElement = document.querySelector('[data-booking-hero]');
              heroElement?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          className="group flex flex-col items-center gap-3 sm:gap-4 transition-all duration-300 transform hover:scale-105 cursor-pointer mt-8 sm:mt-12"
        >
          <LogIn className="w-6 h-6 sm:w-8 sm:h-8 text-white group-hover:text-orange-300 group-hover:animate-pulse drop-shadow-lg" />
          <span className="text-white text-lg sm:text-xl font-semibold group-hover:text-orange-300 transition-colors duration-300 drop-shadow-lg">
            Book Now
          </span>
        </button>
      </div>
    </section>
  );
};

export default CallToActionSection;