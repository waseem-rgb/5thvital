import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

interface NavigationProps {
  className?: string;
}

const Navigation = ({ className }: NavigationProps) => {
  const { user, signOut } = useAuth();

  return (
    <nav className={cn("relative z-50 bg-background/80 backdrop-blur-sm", className)}>
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-4 sm:py-6">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/">
              <img 
                src="/logo/predlabs-logo.png" 
                alt="5thvital Logo" 
                className="h-10 sm:h-12 w-auto"
              />
            </Link>
          </div>

          {/* User Menu */}
          {user && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <Link to="/dashboard">
                  <User className="h-4 w-4 mr-2" />
                  My Orders
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
