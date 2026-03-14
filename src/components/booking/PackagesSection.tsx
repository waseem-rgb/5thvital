import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { usePackages } from '@/hooks/usePackages';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, ArrowRight, AlertCircle, TestTube, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PackageListItem } from '@/types/package';

/**
 * Format price with Indian Rupee symbol
 */
const formatPrice = (price: number | null): string => {
  if (price === null || price === undefined) return '';
  return `₹${price.toLocaleString('en-IN')}`;
};

/**
 * PackagesSection - Displays health screening packages from public.packages table.
 * 
 * Features:
 * - Fetches from public.packages where status = 'published'
 * - Shows featured packages first (is_featured DESC)
 * - Orders by sort_order (ASC)
 * - Horizontal rail scroll with snap behavior
 * - Left/right navigation arrows on desktop
 * - READ-ONLY: No database modifications
 * - Links to /packages/[slug] for details
 */
const PackagesSection = () => {
  const { packages, loading, error } = usePackages();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Card width + gap for scroll calculations
  const CARD_WIDTH = 320;
  const GAP = 24;
  const SCROLL_AMOUNT = CARD_WIDTH + GAP;

  /**
   * Update scroll button visibility based on scroll position
   */
  const updateScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  /**
   * Scroll container left by one card width
   */
  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
  };

  /**
   * Scroll container right by one card width
   */
  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
  };

  // Setup scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Initial check
    updateScrollButtons();

    // Listen for scroll events
    container.addEventListener('scroll', updateScrollButtons);
    // Listen for resize events
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [packages.length]);

  const handleViewDetails = (pkg: PackageListItem) => {
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

          {/* Rail scroll container */}
          <div className="relative">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
              <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden min-w-[320px] max-w-[320px] flex-shrink-0">
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

        {/* Rail scroll container with navigation */}
        <div className="relative group">
          {/* Left scroll button - Desktop only */}
          {canScrollLeft && (
            <Button
              variant="secondary"
              size="icon"
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full shadow-lg 
                         bg-background/95 backdrop-blur border hidden md:flex
                         opacity-0 group-hover:opacity-100 transition-opacity duration-200
                         hover:bg-accent -ml-6"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Right scroll button - Desktop only */}
          {canScrollRight && (
            <Button
              variant="secondary"
              size="icon"
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full shadow-lg 
                         bg-background/95 backdrop-blur border hidden md:flex
                         opacity-0 group-hover:opacity-100 transition-opacity duration-200
                         hover:bg-accent -mr-6"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Scrollable container with snap behavior */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent 
                       pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6
                       snap-x snap-mandatory scroll-smooth"
          >
            <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
              {packages.map((pkg, index) => {
                const hasPrice = pkg.price !== null;
                const hasMrp = pkg.originalPrice !== null;
                const hasDiscount = pkg.discountPercent !== null && pkg.discountPercent > 0;
                const hasTests = pkg.testsCount !== null && pkg.testsCount > 0;

                return (
                  <Card
                    key={pkg.id}
                    className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] 
                               animate-fade-in bg-card flex flex-col 
                               min-w-[320px] max-w-[320px] flex-shrink-0 snap-start"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
                          {pkg.name}
                        </CardTitle>
                        {pkg.isFeatured && (
                          <Badge variant="secondary" className="ml-2 shrink-0 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 flex-1">
                      {/* Pricing */}
                      {(hasPrice || hasMrp) && (
                        <div className="flex items-center gap-2 mb-3">
                          {hasMrp && hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(pkg.originalPrice)}
                            </span>
                          )}
                          {hasPrice && (
                            <span className="text-xl font-bold text-primary">
                              {formatPrice(pkg.price)}
                            </span>
                          )}
                          {hasDiscount && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                              {pkg.discountPercent}% OFF
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Tests included */}
                      {hasTests && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TestTube className="h-4 w-4" />
                          <span>{pkg.testsCount} tests included</span>
                        </div>
                      )}

                      {/* Fallback description if no pricing/tests */}
                      {!hasPrice && !hasMrp && !hasTests && (
                        <p className="text-sm text-muted-foreground">
                          Comprehensive health screening package. Click to view details.
                        </p>
                      )}
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
                );
              })}
            </div>
          </div>

          {/* Scroll indicator dots for mobile */}
          <div className="flex justify-center gap-1.5 mt-4 md:hidden">
            {packages.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Swipe to see {packages.length} packages →
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PackagesSection;
