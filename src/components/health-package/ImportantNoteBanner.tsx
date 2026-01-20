import { AlertTriangle } from 'lucide-react';

const ImportantNoteBanner = () => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 md:p-6 mb-8">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-900 mb-2">Important Note About Cancer Markers</h3>
          <p className="text-sm text-amber-800 leading-relaxed">
            Tumour markers are screening tools only and do not confirm or rule out cancer. 
            All results must be interpreted by a qualified doctor in the right clinical context.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImportantNoteBanner;
