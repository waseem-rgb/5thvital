import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import HealthPackageCard from './HealthPackageCard';
import { useToast } from '@/hooks/use-toast';

interface HealthProfile {
  id: string;
  profile_name: string;
  description: string;
  customer_price: number;
  category: string;
  is_popular: boolean;
  parameters_count?: number;
  report_time?: string;
  original_price?: number;
  discount_percentage?: number;
}

const FALLBACK_PACKAGES: HealthProfile[] = [
  {
    id: 'vital-health-basic',
    profile_name: 'Vital Health Check – Basic',
    description: 'Essential health screening for young adults and first-time users',
    customer_price: 999,
    category: 'Essential Screening',
    is_popular: true,
    parameters_count: 60,
    report_time: '6-8 hours',
    original_price: 1499,
    discount_percentage: 33,
  },
  {
    id: 'vital-health-advanced',
    profile_name: 'Vital Health Check – Advanced',
    description: 'Comprehensive screening for working professionals',
    customer_price: 1499,
    category: 'Comprehensive Screening',
    is_popular: true,
    parameters_count: 85,
    report_time: '6-8 hours',
    original_price: 2199,
    discount_percentage: 32,
  },
  {
    id: 'oncoprotect-comprehensive',
    profile_name: 'OncoProtect Full Body Check – Comprehensive',
    description: 'Premium screening with cancer markers for 35+ age group',
    customer_price: 1999,
    category: 'Premium Screening',
    is_popular: true,
    parameters_count: 100,
    report_time: '6-8 hours',
    original_price: 2999,
    discount_percentage: 33,
  },
];

interface HealthScreeningSectionProps {
  onAddToCart: (item: {
    id: string;
    test_name: string;
    test_code: string;
    body_system: string;
    customer_price: number;
  }) => void;
}

const HealthScreeningSection = ({ onAddToCart }: HealthScreeningSectionProps) => {
  const [profiles, setProfiles] = useState<HealthProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('health_profiles')
          .select('*')
          .eq('is_active', true)
          .order('is_popular', { ascending: false })
          .limit(3);

        if (error) {
          console.log('Database error, using fallback data:', error);
          setProfiles(FALLBACK_PACKAGES);
        } else if (!data || data.length === 0) {
          console.log('No profiles in database, using fallback data');
          setProfiles(FALLBACK_PACKAGES);
        } else {
          console.log('Health Profiles fetched from database:', data);
          const enrichedProfiles: HealthProfile[] = data.map((profile, index) => ({
            ...profile,
            parameters_count: (profile as any).parameters_count || (index === 0 ? 100 : index === 1 ? 120 : 125),
            report_time: (profile as any).report_time || (index === 0 ? '6 hours' : '8 hours'),
            original_price: (profile as any).original_price || (index === 0 ? 7708 : index === 1 ? 9500 : 9800),
            discount_percentage: (profile as any).discount_percentage || (index === 0 ? 64 : index === 1 ? 63 : 62),
          }));
          setProfiles(enrichedProfiles);
        }
      } catch (error) {
        console.error('Error fetching profiles, using fallback:', error);
        setProfiles(FALLBACK_PACKAGES);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [toast]);

  const handleAddToCart = (profile: HealthProfile) => {
    onAddToCart({
      id: profile.id,
      test_name: profile.profile_name,
      test_code: `PROFILE-${profile.id.slice(0, 8)}`,
      body_system: profile.category,
      customer_price: profile.customer_price,
    });

    toast({
      title: "Added to cart",
      description: `${profile.profile_name} has been added to your cart.`,
    });

    // Scroll to cart section after adding
    setTimeout(() => {
      const cartElement = document.querySelector('[data-cart]');
      if (cartElement) {
        cartElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const handleViewDetails = (profile: HealthProfile) => {
    // Map profile names to slugs
    const slugMap: Record<string, string> = {
      'Vital Health Check – Basic': 'vital-health-basic',
      'Vital Health Check – Advanced': 'vital-health-advanced',
      'OncoProtect Full Body Check – Comprehensive': 'oncoprotect-comprehensive',
    };
    
    const slug = slugMap[profile.profile_name] || profile.id;
    navigate(`/package/${slug}`);
  };

  if (loading) {
    return (
      <section data-health-screening className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }


  return (
    <section data-health-screening className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 animate-fade-in">
            Health Screening Packages
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Comprehensive health checkups designed for your wellness
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {profiles.map((profile, index) => (
              <CarouselItem 
                key={profile.id} 
                className="pl-4 md:basis-1/2 lg:basis-1/3 animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
                  <HealthPackageCard
                  id={profile.id}
                  name={profile.profile_name}
                  category={profile.category}
                  price={profile.customer_price}
                  originalPrice={profile.original_price}
                  discount={profile.discount_percentage}
                  parametersCount={profile.parameters_count}
                  reportTime={profile.report_time || "24 hours"}
                  description={profile.description}
                    onAddToCart={() => handleAddToCart(profile)}
                    onViewDetails={() => handleViewDetails(profile)}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
};

export default HealthScreeningSection;
