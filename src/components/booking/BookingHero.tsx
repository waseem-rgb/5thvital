import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

const BookingHero = () => {
  const { user, signOut } = useAuth();
  
  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(`[data-${sectionId}]`);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col">
      <div className="absolute inset-0 overflow-hidden">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          preload="auto"
          className="w-full h-full object-cover"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60"></div>
      </div>

      <nav className="relative z-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4 sm:py-6">
            <Link to="/">
              <Logo className="h-10 sm:h-12 text-white" />
            </Link>

            <div className="hidden md:flex items-center gap-2 lg:gap-4">
              <Button variant="ghost" size="sm" onClick={() => scrollToSection('health-screening')} className="text-white hover:text-white hover:bg-white/10 font-medium">
                Book Health Screening Test
              </Button>
              <Button variant="ghost" size="sm" onClick={() => scrollToSection('book-tests')} className="text-white hover:text-white hover:bg-white/10 font-medium">
                Book Tests
              </Button>
              <Button variant="ghost" size="sm" onClick={() => scrollToSection('prescription-upload')} className="text-white hover:text-white hover:bg-white/10 font-medium">
                Upload Prescription
              </Button>
            </div>

            {user && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild className="text-white hover:text-white hover:bg-white/10">
                  <Link to="/dashboard"><User className="h-4 w-4 mr-2" />My Orders</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut} className="text-white hover:text-white hover:bg-white/10">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex flex-col justify-end px-4 sm:px-6 lg:px-12 pb-12 sm:pb-16 lg:pb-20 pt-12">
        <div className="w-full max-w-7xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight text-left mb-6">
            Precision Diagnostics for Better Health Outcomes
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-white/95 max-w-5xl text-left leading-relaxed">
            Our laboratory follows strict NABL-standard protocols and uses advanced analyzers, automated workflows, and quality-control systems to ensure every test result is accurate, timely, and dependable.
          </p>
        </div>
      </div>
    </section>
  );
};

export default BookingHero;
