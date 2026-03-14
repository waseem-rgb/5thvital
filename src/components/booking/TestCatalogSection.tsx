import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Plus } from 'lucide-react';
import type { CartItem } from '@/types/booking';

const API_URL = import.meta.env.VITE_API_URL || 'http://64.227.129.25';

interface MedicalTest {
  id: string;
  name: string;
  testCode: string | null;
  description: string | null;
  category: string | null;
  price: number;
  sampleType: string | null;
  turnaroundTime: string | null;
  isActive: boolean;
  profileName?: string | null;
}

interface TestCatalogSectionProps {
  onAddToCart: (item: Omit<CartItem, 'quantity'>) => void;
}

const TestCatalogSection = ({ onAddToCart }: TestCatalogSectionProps) => {
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBodySystem, setSelectedBodySystem] = useState<string>('Cardiovascular');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const bodySystems = [
    'Cardiovascular', 'Endocrine', 'Hepatic', 'Renal', 'Hematology'
  ];

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await fetch(`${API_URL}/api/tests?limit=100`);
        const data = await response.json();

        if (import.meta.env.DEV) {
          console.log(`[TestCatalog] Loaded ${data.tests?.length || 0} tests from API`);
        }

        setTests(data.tests || []);
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  // Search suggestions — use API search for better results
  const [searchResults, setSearchResults] = useState<MedicalTest[]>([]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/tests/search?q=${encodeURIComponent(searchQuery)}&limit=20`
        );
        const data = await response.json();
        setSearchResults(data.tests || []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchSuggestions = searchResults.slice(0, 10);

  const filteredTests = tests.filter(test => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      test.name?.toLowerCase().includes(query) ||
      test.description?.toLowerCase().includes(query) ||
      test.category?.toLowerCase().includes(query)
    );

    const matchesBodySystem = test.category === selectedBodySystem;

    return matchesSearch && matchesBodySystem;
  });

  const handleAddToCart = (test: MedicalTest) => {
    onAddToCart({
      id: test.id,
      type: 'test',
      name: test.name,
      price: test.price
    });
  };

  const handleSelectTest = (test: MedicalTest) => {
    setSearchQuery(test.name);
    if (test.category) {
      setSelectedBodySystem(test.category);
    }
    setOpen(false);
    handleAddToCart(test);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intelligent Search */}
      <div className="space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative cursor-pointer">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOpen(e.target.value.length > 0);
                }}
                className="pl-10"
                onFocus={() => searchQuery && setOpen(true)}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Type to search tests..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No tests found.</CommandEmpty>
                <CommandGroup>
                  {searchSuggestions.map((test) => (
                    <CommandItem
                      key={test.id}
                      onSelect={() => handleSelectTest(test)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <span className="font-medium">{test.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {test.category}
                            {test.testCode && ` • ${test.testCode}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">₹{test.price.toLocaleString()}</span>
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="flex gap-4 flex-wrap">
          {bodySystems.map((system) => (
            <button
              key={system}
              onClick={() => setSelectedBodySystem(system)}
              className={`text-sm transition-all ${
                selectedBodySystem === system
                  ? 'text-primary underline font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {system}
            </button>
          ))}
        </div>
      </div>

      {/* Tests List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground">{selectedBodySystem} Tests</h3>
        <div className="space-y-3">
          {filteredTests.map((test) => (
            <div key={test.id} className="flex items-center justify-between py-2 hover:bg-muted/50 rounded-lg px-2 cursor-pointer group" onClick={() => handleAddToCart(test)}>
              <span className="text-sm font-light text-foreground group-hover:text-primary transition-colors font-mono">{test.name}</span>
              <span className="font-semibold text-primary">₹{test.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {filteredTests.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No tests found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default TestCatalogSection;
