import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetsRequest {
  type: 'faqs' | 'tests' | 'search';
  query?: string;
  sheet_id?: string;
  range?: string;
}

// Shendet Labs Google Sheets configuration
const SHENDET_SHEETS_CONFIG = {
  faqs: {
    sheet_id: '1vffNS701X2a3LftWlrgjgG0PfMocTxpDj7jMeLIr6LE', // Shendet Labs FAQ sheet
    range: 'Sheet1!A:C' // Columns: Question, Answer, Category
  },
  tests: {
    sheet_id: '1gCyUXvhGdRVUiXgXpzIRMPEH-xOMfuDHoYRSyAXluk8', // Shendet Labs Tests sheet  
    range: 'Sheet1!A:H' // Columns: Test Name, Code, Description, Price, Body System, Sample Type, Prerequisites, Turnaround Time
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!googleSheetsApiKey) {
      throw new Error('Google Sheets API key not configured');
    }

    const { type, query, sheet_id, range }: SheetsRequest = await req.json();

    if (!type) {
      return new Response(
        JSON.stringify({ error: 'Type is required (faqs, tests, or search)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Google Sheets request:', { type, query });

    let targetSheetId: string;
    let targetRange: string;

    // Determine sheet configuration
    if (sheet_id && range) {
      targetSheetId = sheet_id;
      targetRange = range;
    } else if (type === 'faqs') {
      targetSheetId = SHENDET_SHEETS_CONFIG.faqs.sheet_id;
      targetRange = SHENDET_SHEETS_CONFIG.faqs.range;
    } else if (type === 'tests') {
      targetSheetId = SHENDET_SHEETS_CONFIG.tests.sheet_id;
      targetRange = SHENDET_SHEETS_CONFIG.tests.range;
    } else {
      throw new Error('Invalid type or missing sheet configuration');
    }

    // Fetch data from Google Sheets
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/${targetRange}?key=${googleSheetsApiKey}`;
    
    console.log('📡 Fetching from Google Sheets:', sheetsUrl);

    const response = await fetch(sheetsUrl);
    
    if (!response.ok) {
      console.error('Google Sheets API error:', response.status, await response.text());
      throw new Error(`Google Sheets API error: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          data: [],
          message: `No ${type} data found in the sheet.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process the data based on type
    let processedData: any[] = [];
    let responseMessage = '';

    if (type === 'faqs') {
      // Process FAQs: [Question, Answer, Category]
      const headers = rows[0] || ['Question', 'Answer', 'Category'];
      processedData = rows.slice(1).map((row: any[], index: number) => ({
        id: index + 1,
        question: row[0] || '',
        answer: row[1] || '',
        category: row[2] || 'General'
      }));

      // Filter by query if provided
      if (query) {
        const searchQuery = query.toLowerCase();
        processedData = processedData.filter(faq => 
          faq.question.toLowerCase().includes(searchQuery) ||
          faq.answer.toLowerCase().includes(searchQuery) ||
          faq.category.toLowerCase().includes(searchQuery)
        );
      }

      responseMessage = query 
        ? `Found ${processedData.length} FAQs matching "${query}"`
        : `Retrieved ${processedData.length} FAQs from Shendet Labs`;

    } else if (type === 'tests') {
      // Process Tests: [Test Name, Code, Description, Price, Body System, Sample Type, Prerequisites, Turnaround Time]
      const headers = rows[0] || ['Test Name', 'Code', 'Description', 'Price', 'Body System', 'Sample Type', 'Prerequisites', 'Turnaround Time'];
      processedData = rows.slice(1).map((row: any[], index: number) => ({
        id: index + 1,
        test_name: row[0] || '',
        test_code: row[1] || '',
        description: row[2] || '',
        price: row[3] || '',
        body_system: row[4] || '',
        sample_type: row[5] || '',
        prerequisites: row[6] || '',
        turnaround_time: row[7] || '24-48 hours'
      }));

      // Filter by query if provided
      if (query) {
        const searchQuery = query.toLowerCase();
        processedData = processedData.filter(test => 
          test.test_name.toLowerCase().includes(searchQuery) ||
          test.test_code.toLowerCase().includes(searchQuery) ||
          test.description.toLowerCase().includes(searchQuery) ||
          test.body_system.toLowerCase().includes(searchQuery)
        );
      }

      responseMessage = query 
        ? `Found ${processedData.length} tests matching "${query}"`
        : `Retrieved ${processedData.length} tests from Shendet Labs catalog`;
    }

    console.log('✅ Google Sheets data processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        type,
        data: processedData,
        total_count: processedData.length,
        message: responseMessage,
        query: query || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in google-sheets-shendetlabs:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "I'm having trouble accessing our information database right now. Please let me know what specific information you need and I'll help you as best I can."
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);