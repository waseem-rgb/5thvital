import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileText, Users, Tag, CheckCircle2 } from 'lucide-react';

interface PackageHeroProps {
  packageInfo: {
    name: string;
    alternateName: string;
    category: string;
    originalPrice: number;
    price: number;
    discount: number;
    parametersCount: number;
    reportTime: string;
    popularityText: string;
  };
  onAddToCart: () => void;
}

const PackageHero = ({ packageInfo, onAddToCart }: PackageHeroProps) => {
  return (
    <section className="bg-white border-b py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Category Badge */}
          <Badge className="mb-4 bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200">
            {packageInfo.category}
          </Badge>

          {/* Package Name */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-3 tracking-tight">
            {packageInfo.name}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 font-light">
            {packageInfo.alternateName}
          </p>

          {/* Key Metrics */}
          <div className="flex flex-wrap gap-4 mb-10">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900 font-medium">
                {packageInfo.parametersCount} Parameters
              </span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900 font-medium">
                Reports in {packageInfo.reportTime}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900 font-medium">
                {packageInfo.popularityText}
              </span>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-gray-50 rounded-2xl p-8 md:p-10 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-gray-500 text-2xl line-through">
                    ₹{packageInfo.originalPrice.toLocaleString()}
                  </span>
                  <Badge className="bg-green-600 text-white hover:bg-green-700 font-bold text-base px-3 py-1.5">
                    <Tag className="w-4 h-4 mr-1" />
                    {packageInfo.discount}% OFF
                  </Badge>
                </div>
                <div className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
                  ₹{packageInfo.price.toLocaleString()}
                </div>
                <p className="text-gray-600 text-lg">Inclusive of all taxes</p>
              </div>

              <Button
                size="lg"
                onClick={onAddToCart}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-10 py-7 w-full md:w-auto rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                Add to Cart
              </Button>
            </div>

            {/* Promo Note */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-4 text-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Free Home Sample Collection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium">NABL Certified Lab</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium">100% Accurate Results</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PackageHero;
