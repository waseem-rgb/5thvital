import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2 } from 'lucide-react';

interface ParameterGroupProps {
  groups: Array<{
    title: string;
    parameters: string[];
  }>;
}

const ParameterGroup = ({ groups }: ParameterGroupProps) => {
  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {groups.map((group, index) => (
        <AccordionItem key={index} value={`group-${index}`} className="border rounded-lg bg-white">
          <AccordionTrigger className="px-6 py-4 hover:no-underline text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                {group.parameters.length}
              </div>
              <span className="font-semibold text-gray-900">{group.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <div className="space-y-2 pt-2">
              {group.parameters.map((param, pIndex) => (
                <div key={pIndex} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{param}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default ParameterGroup;
