import { useParams, useNavigate } from 'react-router-dom';
import { usePackageBySlug } from '@/hooks/usePackages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Star, AlertCircle, Package } from 'lucide-react';

/**
 * PackageDetails - Displays a single package from public.packages table.
 * 
 * Route: /packages/:slug
 * 
 * Features:
 * - Fetches package by slug where status = 'published'
 * - Shows 404 if not found or not published
 * - READ-ONLY: No database modifications
 * - Uses ONLY confirmed columns: id, slug, title, status, is_featured, sort_order
 */
const PackageDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { package_data, loading, error, notFound } = usePackageBySlug(slug);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <Button variant="ghost" disabled className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 404 Not Found state
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Package Not Found</h1>
          <p className="text-gray-600 mb-8">
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Package</h1>
          <p className="text-gray-600 mb-8">
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

  return (
    <div className="min-h-screen bg-white">
      {/* Back Button */}
      <div className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Package Details */}
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Package className="h-8 w-8 text-primary" />
                    </div>
                    {package_data.is_featured && (
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Featured Package
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    {package_data.title}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Package ID: {package_data.slug}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-8">
              {/* Coming Soon Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">More Details Coming Soon</h3>
                <p className="text-blue-700 text-sm">
                  We're working on adding detailed information about this health screening package, 
                  including test parameters, pricing, and preparation guidelines. 
                  Check back soon for updates!
                </p>
              </div>

              {/* Package Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Package Title</span>
                  <span className="font-medium text-foreground">{package_data.title}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{package_data.slug}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {package_data.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Featured</span>
                  <span className="font-medium text-foreground">
                    {package_data.is_featured ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 pt-6 border-t">
                <Button 
                  onClick={() => navigate('/')}
                  className="w-full"
                  size="lg"
                >
                  Browse All Tests & Packages
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PackageDetails;
