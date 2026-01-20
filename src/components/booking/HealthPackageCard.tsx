import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileText } from 'lucide-react';

interface HealthPackageCardProps {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  parametersCount?: number;
  reportTime?: string;
  description?: string;
  onAddToCart: () => void;
  onViewDetails: () => void;
}

const HealthPackageCard = ({
  name,
  category,
  price,
  originalPrice,
  discount,
  parametersCount,
  reportTime,
  description,
  onAddToCart,
  onViewDetails,
}: HealthPackageCardProps) => {
  return (
    <div className="relative bg-card border-2 border-border/50 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[320px] h-[400px] flex flex-col">
      {/* Package Name */}
      <h3 className="text-lg font-bold text-foreground mb-4">
        {name}
      </h3>

      {/* Price Section */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          {originalPrice && (
            <span className="text-muted-foreground line-through text-xs font-medium">
              ₹{originalPrice.toLocaleString()}
            </span>
          )}
          <span className="text-2xl font-bold text-foreground">
            ₹{price.toLocaleString()}
          </span>
        </div>
        {discount && (
          <Badge className="bg-foreground text-background hover:bg-foreground/90 font-semibold border-0 text-xs">
            {discount}% Off
          </Badge>
        )}
      </div>

      {/* Package Details */}
      <div className="space-y-2 mb-6 flex-grow">
        {parametersCount && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <FileText className="w-4 h-4" />
            <span>{parametersCount} parameters included</span>
          </div>
        )}
        {reportTime && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Clock className="w-4 h-4" />
            <span>Reports within {reportTime}</span>
          </div>
        )}
        {description && (
          <p className="text-muted-foreground text-xs line-clamp-2 mt-2 font-medium">
            {description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        <Button 
          variant="outline" 
          className="flex-1 border-2 border-border hover:bg-accent hover:text-accent-foreground font-semibold transition-all text-sm"
          onClick={onViewDetails}
        >
          View Details
        </Button>
        <Button 
          className="flex-1 bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-md transition-all text-sm"
          onClick={onAddToCart}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

export default HealthPackageCard;
