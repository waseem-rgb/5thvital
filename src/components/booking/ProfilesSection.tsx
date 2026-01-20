import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Star, ChevronDown } from 'lucide-react';
import type { CartItem } from '@/types/booking';

interface HealthProfile {
  id: string;
  profile_name: string;
  description: string;
  customer_price: number;
  category: string;
  is_popular: boolean;
}

interface ProfilesSectionProps {
  onAddToCart: (item: Omit<CartItem, 'quantity'>) => void;
}

const ProfilesSection = ({ onAddToCart }: ProfilesSectionProps) => {
  const [profiles, setProfiles] = useState<HealthProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('health_profiles')
          .select('*')
          .eq('is_active', true)
          .order('is_popular', { ascending: false });

        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleAddToCart = (profile: HealthProfile) => {
    onAddToCart({
      id: profile.id,
      type: 'profile',
      name: profile.profile_name,
      price: profile.customer_price
    });
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const popularProfiles = profiles.filter(profile => profile.is_popular);
  const otherProfiles = profiles.filter(profile => !profile.is_popular);

  return (
    <div className="space-y-6">
      {/* Popular Profiles */}
      {popularProfiles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            Popular Health Packages
          </h3>
          <div className="space-y-2">
            {popularProfiles.map((profile) => (
              <Collapsible key={profile.id}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-0 text-left hover:text-primary transition-colors group">
                  <div className="flex items-center gap-4">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{profile.profile_name}</span>
                    <span className="text-sm text-muted-foreground">({profile.category})</span>
                    <span className="font-semibold text-primary">₹{profile.customer_price.toLocaleString()}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-4 pl-0">
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">{profile.description}</p>
                    <Button 
                      onClick={() => handleAddToCart(profile)}
                      size="sm"
                      className="gap-1 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Cart
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* Other Profiles */}
      {otherProfiles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">
            Other Health Packages
          </h3>
          <div className="space-y-2">
            {otherProfiles.map((profile) => (
              <Collapsible key={profile.id}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-0 text-left hover:text-primary transition-colors group">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{profile.profile_name}</span>
                    <span className="text-sm text-muted-foreground">({profile.category})</span>
                    <span className="font-semibold text-primary">₹{profile.customer_price.toLocaleString()}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-4 pl-0">
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">{profile.description}</p>
                    <Button 
                      onClick={() => handleAddToCart(profile)}
                      size="sm"
                      className="gap-1 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Cart
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {profiles.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No health profiles available at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default ProfilesSection;
