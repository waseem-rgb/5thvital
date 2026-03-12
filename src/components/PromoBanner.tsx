import { useState } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

const PromoBanner = () => {
  const { getSetting, loading } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed) return null;

  const enabled = getSetting('promo_banner_enabled', 'false');
  const text = getSetting('promo_banner_text', '');

  if (enabled !== 'true' || !text) return null;

  return (
    <div className="relative bg-primary text-primary-foreground text-center text-sm py-2 px-8">
      <span>{text}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PromoBanner;
