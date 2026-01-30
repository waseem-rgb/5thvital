import { useNavigate } from 'react-router-dom';
import { usePackages } from '@/hooks/usePackages';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, ArrowRight, AlertCircle } from 'lucide-react';
import type { PackagePublic } from '@/types/package';

/**
 * PackagesSection - Displays health screening packages from public.packages table.
 * 
 * Features:
 * - Fetches from public.packages where status = 'published'
 * - Shows featured packages first
 * - Orders by sort_order
 * - READ-ONLY: No database modifications
 * - Links to /packages/[slug] for details
 */
const PackagesSection = () => {
  const { packages, loading, error } = usePackages();
  const navigate = useNavigate();

  const handleViewDetails = (pkg: PackagePublic) => {
    navigate(`/packages/${pkg.slug}`);
  };

  // Loading state
  if (loading) {
    return (
      <section data-packages className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Health Screening Packages
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Comprehensive health checkups designed for your wellness
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section data-packages className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Health Screening Packages
            </h2>
          </div>

          <div className="max-w-md mx-auto text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Unable to load packages at this time. Please try again later.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (packages.length === 0) {
    return (
      <section data-packages className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Health Screening Packages
            </h2>
          </div>

          <div className="max-w-md mx-auto text-center py-12">
            <p className="text-muted-foreground">
              No packages available yet. Check back soon!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-packages className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 animate-fade-in">
            Health Screening Packages
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Comprehensive health checkups designed for your wellness
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {packages.map((pkg, index) => (
            <Card 
              key={pkg.id} 
              className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-fade-in bg-card"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
                    {pkg.title}
                  </CardTitle>
                  {pkg.is_featured && (
                    <Badge variant="secondary" className="ml-2 shrink-0 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Featured
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Comprehensive health screening package. Click to view details.
                </p>
              </CardContent>

              <CardFooter className="pt-4 border-t">
                <Button 
                  onClick={() => handleViewDetails(pkg)}
                  className="w-full group"
                  variant="outline"
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PackagesSection;
