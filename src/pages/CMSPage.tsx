import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPageBySlug } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import Navigation from '@/components/Navigation';

// ─── Section Types ───────────────────────────────────────────

interface HeroSection {
  type: 'hero';
  heading: string;
  subtitle?: string;
  cta_text?: string;
  cta_url?: string;
}

interface RichTextSection {
  type: 'rich_text';
  html: string;
}

interface FeatureGridItem {
  icon?: string;
  title: string;
  description: string;
}

interface FeatureGridSection {
  type: 'feature_grid';
  heading?: string;
  items: FeatureGridItem[];
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  type: 'faq';
  heading?: string;
  items: FAQItem[];
}

interface CalloutSection {
  type: 'callout';
  heading: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
}

type PageSection = HeroSection | RichTextSection | FeatureGridSection | FAQSection | CalloutSection;

interface CMSPageData {
  id: string;
  slug: string;
  title: string;
  content_json: PageSection[] | null;
  seo_title: string | null;
  seo_description: string | null;
}

// ─── Section Renderers ───────────────────────────────────────

const SectionHero = ({ section }: { section: HeroSection }) => (
  <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-16 sm:py-24 px-4">
    <div className="container mx-auto max-w-4xl text-center">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
        {section.heading}
      </h1>
      {section.subtitle && (
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          {section.subtitle}
        </p>
      )}
      {section.cta_text && section.cta_url && (
        <Link to={section.cta_url}>
          <Button size="lg">{section.cta_text}</Button>
        </Link>
      )}
    </div>
  </section>
);

const SectionRichText = ({ section }: { section: RichTextSection }) => (
  <section className="py-12 px-4">
    <div
      className="container mx-auto max-w-3xl prose prose-sm sm:prose dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.html) }}
    />
  </section>
);

const SectionFeatureGrid = ({ section }: { section: FeatureGridSection }) => (
  <section className="py-12 px-4">
    <div className="container mx-auto max-w-5xl">
      {section.heading && (
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">{section.heading}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {section.items.map((item, i) => (
          <Card key={i}>
            <CardContent className="pt-6 text-center">
              {item.icon && <div className="text-3xl mb-3">{item.icon}</div>}
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

const SectionFAQ = ({ section }: { section: FAQSection }) => (
  <section className="py-12 px-4">
    <div className="container mx-auto max-w-3xl">
      {section.heading && (
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">{section.heading}</h2>
      )}
      <Accordion type="single" collapsible className="w-full">
        {section.items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left hover:no-underline">
              <span className="font-medium">{item.question}</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

const SectionCallout = ({ section }: { section: CalloutSection }) => (
  <section className="py-12 px-4">
    <div className="container mx-auto max-w-3xl">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{section.heading}</h2>
          {section.description && (
            <p className="text-muted-foreground mb-4">{section.description}</p>
          )}
          {section.cta_text && section.cta_url && (
            <Link to={section.cta_url}>
              <Button>{section.cta_text}</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  </section>
);

const renderSection = (section: PageSection, index: number) => {
  switch (section.type) {
    case 'hero':
      return <SectionHero key={index} section={section} />;
    case 'rich_text':
      return <SectionRichText key={index} section={section} />;
    case 'feature_grid':
      return <SectionFeatureGrid key={index} section={section} />;
    case 'faq':
      return <SectionFAQ key={index} section={section} />;
    case 'callout':
      return <SectionCallout key={index} section={section} />;
    default:
      return null;
  }
};

// ─── Page Component ──────────────────────────────────────────

const CMSPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<CMSPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await fetchPageBySlug(slug);

      if (error || !data?.page) {
        setNotFound(true);
      } else {
        const p = data.page;
        const sections = Array.isArray(p.content_json) ? p.content_json : [];
        setPage({ ...p, content_json: sections as PageSection[] } as CMSPageData);

        // Set document title & meta
        document.title = p.seo_title ? String(p.seo_title) : `${p.title} | 5thvital`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && p.seo_description) {
          metaDesc.setAttribute('content', String(p.seo_description));
        }
      }

      setLoading(false);
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-32 px-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
          <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {page.content_json && page.content_json.map((section, i) => renderSection(section, i))}
    </div>
  );
};

export default CMSPage;
