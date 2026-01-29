import { AlertTriangle } from 'lucide-react';
import { missingEnvVars } from '@/integrations/supabase/client';

export function ConfigErrorBanner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Configuration Missing
          </h1>
        </div>
        
        <p className="text-gray-600 mb-4">
          The application cannot connect to the database because required environment variables are not set.
        </p>
        
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Missing variables:</p>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
            {missingEnvVars.map((envVar) => (
              <li key={envVar}>
                <code className="bg-red-50 px-1 rounded">{envVar}</code>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="border-t pt-4">
          <p className="text-sm text-gray-500">
            <strong>For Vercel deployment:</strong> Go to your project settings → Environment Variables and add the missing variables.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            <strong>For local development:</strong> Create a <code className="bg-gray-100 px-1 rounded">.env</code> file in the project root with the required variables.
          </p>
        </div>
      </div>
    </div>
  );
}
