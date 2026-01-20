import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Lightbulb, HelpCircle, List, FlaskConical } from 'lucide-react';
import ParameterGroup from './ParameterGroup';

interface PackageTabsProps {
  packageInfo: {
    about: string;
    parameterGroups: Array<{
      title: string;
      parameters: string[];
    }>;
    preparation: Array<{ title: string; description: string }>;
    whyTake: string[];
    faqs: Array<{ question: string; answer: string }>;
  };
}

const PackageTabs = ({ packageInfo }: PackageTabsProps) => {
  const [activeTab, setActiveTab] = useState('about');

  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
          {/* Tab Navigation */}
          <div className="sticky top-[73px] z-40 bg-gray-50 pb-6 mb-8">
            <TabsList className="grid w-full grid-cols-5 h-auto bg-white border border-gray-200 rounded-xl p-1">
              <TabsTrigger 
                value="about" 
                className="flex items-center gap-2 py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">About</span>
              </TabsTrigger>
              <TabsTrigger 
                value="parameters" 
                className="flex items-center gap-2 py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Parameters</span>
              </TabsTrigger>
              <TabsTrigger 
                value="preparation" 
                className="flex items-center gap-2 py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <FlaskConical className="w-4 h-4" />
                <span className="hidden sm:inline">Preparation</span>
              </TabsTrigger>
              <TabsTrigger 
                value="why" 
                className="flex items-center gap-2 py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Why Take</span>
              </TabsTrigger>
              <TabsTrigger 
                value="faqs" 
                className="flex items-center gap-2 py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">FAQs</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">
                About This Test
              </h2>
              <p className="text-gray-700 leading-relaxed text-lg">
                {packageInfo.about}
              </p>
            </div>
          </TabsContent>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">
                Test Parameters
              </h2>
              <p className="text-gray-600 mb-8">
                Detailed breakdown of all health parameters included in this package
              </p>
              <ParameterGroup groups={packageInfo.parameterGroups} />
            </div>
          </TabsContent>

          {/* Preparation Tab */}
          <TabsContent value="preparation" className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">
                Test Preparation
              </h2>
              <div className="space-y-4">
                {packageInfo.preparation.map((item, index) => (
                  <div
                    key={index}
                    className="p-6 bg-blue-50 rounded-xl border border-blue-100"
                  >
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">{item.title}</h3>
                    <p className="text-gray-700">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Why Take Tab */}
          <TabsContent value="why" className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">
                Who Should Take This Test?
              </h2>
              <div className="space-y-3">
                {packageInfo.whyTake.map((reason, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <span className="text-gray-700 text-lg">{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* FAQs Tab */}
          <TabsContent value="faqs" className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="w-full space-y-3">
                {packageInfo.faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`faq-${index}`} 
                    className="border border-gray-200 rounded-lg bg-gray-50 px-6"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-5">
                      <span className="font-semibold text-gray-900">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 pb-5 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default PackageTabs;
