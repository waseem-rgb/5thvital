import { useParams, useNavigate } from 'react-router-dom';
import { usePackageBySlug } from '@/hooks/usePackages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Star,
  AlertCircle,
  Clock,
  TestTube,
  FileText,
  Home,
  ChevronDown,
  Sparkles,
  ShoppingCart,
  CheckCircle,
  Beaker,
  ClipboardList,
  HelpCircle,
  Info,
} from 'lucide-react';
import { useState } from 'react';
import type { ParameterCategory } from '@/types/package';

/**
 * PackageDetails - Displays a single package from public.packages table.
 * 
 * Route: /packages/:slug
 * 
 * Features:
 * - Fetches package by slug where status = 'published'
 * - Shows 404 if not found or not published
 * - READ-ONLY: No database modifications
 * - Orange-Health style layout with:
 *   - Hero section with title, pricing, CTA
 *   - Stat tiles row
 *   - Tab-based content: About, Parameters, Preparation, Why This Test, FAQs
 */

/**
 * Format price with Indian Rupee symbol
 */
const formatPrice = (price: number | null): string => {
  if (price === null || price === undefined) return '—';
  return `₹${price.toLocaleString('en-IN')}`;
};

/**
 * SnapshotCard - Displays a single snapshot stat
 */
const SnapshotCard = ({
  icon: Icon,
  label,
  value,
  className = '',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  className?: string;
}) => {
  if (value === null || value === undefined) return null;
  
  return (
    <div className={`flex flex-col items-center p-4 bg-muted/50 rounded-xl text-center ${className}`}>
      <div className="p-2 bg-primary/10 rounded-lg mb-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-foreground text-sm">{value}</p>
    </div>
  );
};

/**
 * ParameterCategoryCard - Displays a category of test parameters (collapsible)
 */
const ParameterCategoryCard = ({ category }: { category: ParameterCategory }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TestTube className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">
                    {category.category}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {category.count} {category.count === 1 ? 'parameter' : 'parameters'}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="border-t pt-4">
              <ul className="space-y-2">
                {category.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-foreground">{item.name}</span>
                      {item.description && (
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const PackageDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { package_data, loading, error, notFound } = usePackageBySlug(slug);
  const [activeTab, setActiveTab] = useState('about');

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <Button variant="ghost" disabled className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
            </div>
            
            {/* Pricing skeleton */}
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
            
            {/* Snapshot cards skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
            
            {/* Tabs skeleton */}
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // 404 Not Found state
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-4">Package Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The health package you're looking for doesn't exist or is no longer available.
          </p>
          <Button onClick={() => navigate('/')} className="bg-primary hover:bg-primary/90">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !package_data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-4">Error Loading Package</h1>
          <p className="text-muted-foreground mb-8">
            {error || 'Unable to load package details. Please try again later.'}
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const hasPrice = package_data.price !== null;
  const hasMrp = package_data.mrp !== null;
  const hasDiscount = package_data.discount_percent !== null && package_data.discount_percent > 0;
  const hasSnapshots = 
    package_data.reports_within_hours !== null ||
    package_data.tests_included !== null ||
    package_data.requisites !== null ||
    package_data.home_collection_minutes !== null;
  const hasHighlights = package_data.highlights !== null && package_data.highlights.trim() !== '';
  const hasDescription = package_data.description !== null && package_data.description.trim() !== '';
  const hasParameters = package_data.parameters !== null && package_data.parameters.length > 0;
  const hasFaqs = package_data.faqs !== null && package_data.faqs.length > 0;
  const hasRequisites = package_data.requisites !== null && package_data.requisites.trim() !== '';

  // Calculate total parameters count
  const totalParameters = hasParameters 
    ? package_data.parameters!.reduce((acc, cat) => acc + cat.count, 0) 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* HERO SECTION */}
          <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-background rounded-2xl p-6 sm:p-8 mb-8">
            {/* Title + Featured Badge */}
            <div className="flex flex-wrap items-start gap-3 mb-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                {package_data.title}
              </h1>
              {package_data.is_featured && (
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 shrink-0">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Featured
                </Badge>
              )}
            </div>

            {/* Short description from highlights */}
            {hasHighlights && (
              <p className="text-muted-foreground mb-6 line-clamp-2">
                {package_data.highlights}
              </p>
            )}

            {/* Pricing Row */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {hasMrp && hasDiscount && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(package_data.mrp)}
                </span>
              )}
              {hasPrice && (
                <span className="text-3xl sm:text-4xl font-bold text-primary">
                  {formatPrice(package_data.price)}
                </span>
              )}
              {hasDiscount && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm px-3 py-1">
                  {package_data.discount_percent}% OFF
                </Badge>
              )}
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate('/')}
              size="lg"
              className="w-full sm:w-auto"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>

          {/* STATS TILES ROW */}
          {hasSnapshots && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
              <SnapshotCard
                icon={Clock}
                label="Reports Within"
                value={package_data.reports_within_hours ? `${package_data.reports_within_hours} hours` : null}
              />
              <SnapshotCard
                icon={TestTube}
                label="Tests Included"
                value={package_data.tests_included ? `${package_data.tests_included} tests` : null}
              />
              <SnapshotCard
                icon={FileText}
                label="Requisites"
                value={package_data.requisites}
              />
              <SnapshotCard
                icon={Home}
                label="Home Collection"
                value={package_data.home_collection_minutes ? `${package_data.home_collection_minutes} mins` : null}
              />
            </div>
          )}

          {/* TABBED CONTENT SECTION */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
              <TabsTrigger 
                value="about" 
                className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background"
              >
                <Info className="h-4 w-4 hidden sm:inline" />
                About
              </TabsTrigger>
              {hasParameters && (
                <TabsTrigger 
                  value="parameters" 
                  className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background"
                >
                  <Beaker className="h-4 w-4 hidden sm:inline" />
                  Parameters
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {totalParameters}
                  </Badge>
                </TabsTrigger>
              )}
              {hasRequisites && (
                <TabsTrigger 
                  value="preparation" 
                  className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background"
                >
                  <ClipboardList className="h-4 w-4 hidden sm:inline" />
                  Preparation
                </TabsTrigger>
              )}
              {hasHighlights && (
                <TabsTrigger 
                  value="why" 
                  className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background"
                >
                  <Sparkles className="h-4 w-4 hidden sm:inline" />
                  Why This Test
                </TabsTrigger>
              )}
              {hasFaqs && (
                <TabsTrigger 
                  value="faqs" 
                  className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background"
                >
                  <HelpCircle className="h-4 w-4 hidden sm:inline" />
                  FAQs
                </TabsTrigger>
              )}
            </TabsList>

            {/* ABOUT TAB */}
            <TabsContent value="about" className="mt-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    About This Package
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasDescription ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {package_data.description}
                      </p>
                    </div>
                  ) : hasHighlights ? (
                    <p className="text-muted-foreground leading-relaxed">
                      {package_data.highlights}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      This comprehensive health screening package includes {package_data.tests_included || 'multiple'} tests 
                      to give you a complete picture of your health status.
                    </p>
                  )}

                  {/* Quick summary list */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {package_data.tests_included && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{package_data.tests_included} tests included</span>
                      </div>
                    )}
                    {package_data.reports_within_hours && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Reports within {package_data.reports_within_hours} hours</span>
                      </div>
                    )}
                    {package_data.home_collection_minutes && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Home collection available</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Digital reports on email</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PARAMETERS TAB */}
            {hasParameters && (
              <TabsContent value="parameters" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <TestTube className="h-5 w-5 text-primary" />
                      Test Parameters
                    </h2>
                    <Badge variant="secondary">
                      {totalParameters} total
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {package_data.parameters!.map((category, index) => (
                      <ParameterCategoryCard key={index} category={category} />
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}

            {/* PREPARATION TAB */}
            {hasRequisites && (
              <TabsContent value="preparation" className="mt-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      Test Preparation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                      <p className="text-amber-800 dark:text-amber-200 text-sm font-medium mb-2">
                        Important Preparation Instructions
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 text-sm">
                        {package_data.requisites}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium text-foreground">General Guidelines:</h3>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Wear comfortable, loose-fitting clothing for easy sample collection</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Stay hydrated by drinking water (unless fasting is required)</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Inform the phlebotomist about any medications you are taking</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Bring a valid ID for verification</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* WHY THIS TEST TAB */}
            {hasHighlights && (
              <TabsContent value="why" className="mt-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Why Choose This Test
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {package_data.highlights}
                    </p>

                    <div className="space-y-4">
                      <h3 className="font-medium text-foreground">Benefits:</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Comprehensive health assessment</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Early detection of health issues</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>NABL accredited laboratory</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Expert pathologist consultation</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Convenient home collection</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Digital reports with insights</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* FAQS TAB */}
            {hasFaqs && (
              <TabsContent value="faqs" className="mt-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    Frequently Asked Questions
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {package_data.faqs!.map((faq, index) => (
                      <AccordionItem key={index} value={`faq-${index}`}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          <span className="font-medium">{faq.question}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* STICKY CTA SECTION */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t py-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-3 max-w-4xl mx-auto">
              <Button
                onClick={() => navigate('/')}
                className="flex-1"
                size="lg"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Book This Package — {hasPrice ? formatPrice(package_data.price) : 'View Price'}
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="lg"
              >
                Browse All Packages
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetails;
