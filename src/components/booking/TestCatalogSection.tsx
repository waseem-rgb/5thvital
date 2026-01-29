import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Plus } from 'lucide-react';
import type { CartItem } from '@/types/booking';

/**
 * Medical test data from the `medical_tests_import` table.
 * This table contains the imported test catalog data with public read access.
 * Note: This component uses the same table as SearchTestsSection for consistency.
 */
interface MedicalTestImport {
  id: string;
  test_name: string;
  test_code: string | null;
  description: string | null;
  body_system: string | null;
  customer_price: number;
  sample_type: string | null;
  report_delivered_in: string | null;
  synonyms: string | null;
  profile_name: string | null;
}

interface TestCatalogSectionProps {
  onAddToCart: (item: Omit<CartItem, 'quantity'>) => void;
}

const TestCatalogSection = ({ onAddToCart }: TestCatalogSectionProps) => {
  const [tests, setTests] = useState<MedicalTestImport[]>([]);
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
        // Query medical_tests_import table (not medical_tests)
        // No is_active filter needed as all imported tests are active
        const { data, error } = await supabase
          .from('medical_tests_import')
          .select('id, test_name, test_code, description, body_system, customer_price, sample_type, report_delivered_in, synonyms, profile_name')
          .order('body_system', { ascending: true });

        if (error) {
          if (import.meta.env.DEV) {
            console.error('[TestCatalog] Error fetching tests:', error);
          }
          throw error;
        }
        
        if (import.meta.env.DEV) {
          console.log(`[TestCatalog] Loaded ${data?.length || 0} tests from medical_tests_import`);
        }
        
        setTests(data || []);
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  // Search suggestions across all tests
  const searchSuggestions = tests.filter(test => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    return (
      test.test_name?.toLowerCase().includes(query) ||
      test.description?.toLowerCase().includes(query) ||
      test.body_system?.toLowerCase().includes(query) ||
      test.test_code?.toLowerCase().includes(query) ||
      test.synonyms?.toLowerCase().includes(query) ||
      test.profile_name?.toLowerCase().includes(query)
    );
  }).slice(0, 10); // Limit to 10 suggestions

  const filteredTests = tests.filter(test => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      test.test_name?.toLowerCase().includes(query) ||
      test.description?.toLowerCase().includes(query) ||
      test.body_system?.toLowerCase().includes(query) ||
      test.synonyms?.toLowerCase().includes(query)
    );
    
    const matchesBodySystem = test.body_system === selectedBodySystem;
    
    return matchesSearch && matchesBodySystem;
  });

  const handleAddToCart = (test: MedicalTestImport) => {
    onAddToCart({
      id: test.id,
      type: 'test',
      name: test.test_name,
      price: test.customer_price
    });
  };

  const handleSelectTest = (test: MedicalTestImport) => {
    setSearchQuery(test.test_name);
    if (test.body_system) {
      setSelectedBodySystem(test.body_system);
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
                          <span className="font-medium">{test.test_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {test.body_system}
                            {test.test_code && ` • ${test.test_code}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">₹{test.customer_price.toLocaleString()}</span>
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
              <span className="text-sm font-light text-foreground group-hover:text-primary transition-colors font-mono">{test.test_name}</span>
              <span className="font-semibold text-primary">₹{test.customer_price.toLocaleString()}</span>
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
