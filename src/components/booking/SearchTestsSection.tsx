import { Search, Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { searchTests, TestResult } from '@/lib/api';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type TestSuggestion = TestResult;

interface SearchTestsSectionProps {
  onAddToCart: (test: TestSuggestion) => void;
}

type SearchState = 'idle' | 'loading' | 'results' | 'empty' | 'error';

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 300;

const SearchTestsSection = ({ onAddToCart }: SearchTestsSectionProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tests, setTests] = useState<TestSuggestion[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousTestsRef = useRef<TestSuggestion[]>([]);
  const requestIdRef = useRef<number>(0);
  const { toast } = useToast();

  const performSearch = useCallback(async (term: string, currentTests: TestSuggestion[]) => {
    const currentRequestId = ++requestIdRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (currentTests.length > 0) {
      previousTestsRef.current = currentTests;
    }

    setSearchState('loading');
    setErrorMessage(null);

    try {
      const { data, error } = await searchTests(term);

      if (currentRequestId !== requestIdRef.current) return;

      if (error) throw new Error(error);

      const results = (data?.tests || []) as TestSuggestion[];
      setTests(results);
      previousTestsRef.current = results;

      if (results.length > 0) {
        setSearchState('results');
      } else {
        setSearchState('empty');
      }

      setOpen(true);
    } catch (err) {
      const errorObj = err as { message?: string; name?: string };

      if (errorObj.name === 'AbortError') return;
      if (currentRequestId !== requestIdRef.current) return;

      if (errorObj.message?.includes('Network') || errorObj.message?.includes('Failed to fetch')) {
        setErrorMessage('Network error. Please check your connection.');
      } else {
        setErrorMessage('Search failed. Please try again.');
      }

      setSearchState('error');
      setTests([]);
    }
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();

    if (!term || term.length < MIN_SEARCH_LENGTH) {
      setTests([]);
      previousTestsRef.current = [];
      setSearchState('idle');
      setOpen(false);
      setErrorMessage(null);
      return;
    }

    const currentTests = tests;
    const timer = setTimeout(() => {
      performSearch(term, currentTests);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleClear = () => {
    setSearchTerm('');
    setTests([]);
    previousTestsRef.current = [];
    setSearchState('idle');
    setOpen(false);
    setErrorMessage(null);
    inputRef.current?.focus();
  };

  const handleRetry = () => {
    const term = searchTerm.trim();
    if (term.length >= MIN_SEARCH_LENGTH) {
      performSearch(term, tests);
    }
  };

  const handleSelectTest = (test: TestSuggestion) => {
    onAddToCart(test);
    toast({
      title: "Added to cart",
      description: `${test.name} has been added to your cart.`,
    });
    setSearchTerm('');
    setTests([]);
    previousTestsRef.current = [];
    setSearchState('idle');
    setOpen(false);

    setTimeout(() => {
      const cartElement = document.querySelector('[data-cart]');
      if (cartElement) {
        cartElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const displayTests = searchState === 'loading' && previousTestsRef.current.length > 0
    ? previousTestsRef.current
    : tests;

  const searchSuggestions = displayTests.slice(0, 8);

  const renderCommandContent = () => {
    switch (searchState) {
      case 'loading':
        return (
          <CommandGroup>
            {previousTestsRef.current.length > 0 ? (
              searchSuggestions.map((test) => (
                <CommandItem key={test.id} disabled className="opacity-50">
                  <div className="flex items-center justify-between w-full p-3">
                    <div className="flex flex-col flex-1">
                      <span className="font-medium text-sm">{test.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {test.testCode && <span>{test.testCode}</span>}
                        {test.sampleType && <span> • {test.sampleType}</span>}
                        {test.turnaroundTime && <span> • {test.turnaroundTime}</span>}
                      </span>
                    </div>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </CommandItem>
              ))
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            )}
          </CommandGroup>
        );

      case 'error':
        return (
          <div className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive mb-3">{errorMessage || 'Search failed'}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        );

      case 'empty':
        return (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No tests found matching "{searchTerm}"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different search term or check the spelling
            </p>
          </div>
        );

      case 'results':
        return (
          <CommandGroup>
            {searchSuggestions.map((test) => (
              <CommandItem key={test.id} onSelect={() => handleSelectTest(test)} className="cursor-pointer min-h-[56px]">
                <div className="flex items-center justify-between w-full p-3">
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate">{test.name}</span>
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      {test.testCode && (
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{test.testCode}</span>
                      )}
                      {test.sampleType && <span>• {test.sampleType}</span>}
                      {test.turnaroundTime && <span>• {test.turnaroundTime}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                    {test.price > 0 && (
                      <span className="text-sm font-semibold text-primary">₹{test.price.toLocaleString()}</span>
                    )}
                    <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors">
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        );

      default:
        return <CommandEmpty>Type at least {MIN_SEARCH_LENGTH} characters to search</CommandEmpty>;
    }
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
                    type="text"
                    placeholder="Search for tests (e.g., lipid, thyroid, CBC)..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full h-14 md:h-16 pl-14 pr-12 rounded-full bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-lg text-sm md:text-base border border-border"
                  />
                  {searchTerm && (
                    <button
                      onClick={handleClear}
                      className="absolute right-5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                  {searchState === 'loading' && (
                    <Loader2 className="absolute right-12 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </PopoverAnchor>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[600px] p-0 z-50" align="start" side="bottom" sideOffset={8}>
                <Command>
                  <CommandList className="max-h-60 sm:max-h-[400px] overflow-y-auto">
                    {renderCommandContent()}
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
