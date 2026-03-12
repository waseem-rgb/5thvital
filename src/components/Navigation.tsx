import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { User, LogOut, Phone } from "lucide-react";

interface NavigationProps {
  className?: string;
}

const Navigation = ({ className }: NavigationProps) => {
  const { user, signOut } = useAuth();
  const { getSetting } = useSettings();
  const contactPhone = getSetting('contact_phone', '');

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

          <div className="flex items-center gap-2">
            {/* Contact Phone */}
            {contactPhone && (
              <a href={`tel:${contactPhone}`} className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2">
                <Phone className="h-4 w-4" />
                {contactPhone}
              </a>
            )}

            {/* User Menu */}
            {user && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
