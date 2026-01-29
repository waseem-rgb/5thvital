import { Search, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface MedicalTestImport {
  id: string;
  test_name: string;
  test_code: string;
  description: string | null;
  body_system: string | null;
  customer_price: number;
}

type TestSuggestion = Pick<MedicalTestImport, 'id' | 'test_name' | 'test_code' | 'body_system' | 'customer_price'>;

interface SearchTestsSectionProps {
  onAddToCart: (test: TestSuggestion) => void;
}

const SearchTestsSection = ({ onAddToCart }: SearchTestsSectionProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tests, setTests] = useState<TestSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setTests([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('medical_tests_import')
          .select('id, test_name, test_code, body_system, customer_price')
          .or(`test_name.ilike.%${term}%,description.ilike.%${term}%`)
          .limit(20);
        
        if (error) throw error;
        setTests(data || []);
        setOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
        setTests([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchSuggestions = tests.slice(0, 8);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setOpen(e.target.value.length > 0);
  };

  const handleSelectTest = (test: TestSuggestion) => {
    onAddToCart(test);
    toast({
      title: "Added to cart",
      description: `${test.test_name} has been added to your cart.`,
    });
    setSearchTerm('');
    setTests([]);
    setOpen(false);

    // Scroll to cart section after adding
    setTimeout(() => {
      const cartElement = document.querySelector('[data-cart]');
      if (cartElement) {
        cartElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  return (
    <section data-book-tests className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Book Individual Tests
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Search for specific medical tests or profiles and add them to your cart
            </p>
          </div>

          <div className="w-full">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverAnchor asChild>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <input
                    ref={inputRef}
                    type="search"
                    placeholder="Search for tests or profiles..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full h-14 md:h-16 pl-14 pr-6 rounded-full bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-lg text-sm md:text-base border border-border"
                  />
                </div>
              </PopoverAnchor>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[600px] p-0 z-50" align="start" side="bottom" sideOffset={8}>
                <Command>
                  <CommandList className="max-h-[400px]">
                    <CommandEmpty>No tests found.</CommandEmpty>
                    <CommandGroup>
                      {searchSuggestions.map((test) => (
                        <CommandItem key={test.id} onSelect={() => handleSelectTest(test)} className="cursor-pointer">
                          <div className="flex items-center justify-between w-full p-3">
                            <div className="flex flex-col flex-1">
                              <span className="font-medium text-sm">{test.test_name}</span>
                              <span className="text-xs text-muted-foreground">{test.body_system} • {test.test_code}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-semibold">₹{test.customer_price.toLocaleString()}</span>
                              <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors">
                                <Plus className="h-4 w-4" />
                                Add
                              </button>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchTestsSection;
