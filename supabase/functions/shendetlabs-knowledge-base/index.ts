import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeRequest {
  query: string;
  category?: 'services' | 'policies' | 'contact' | 'accreditation' | 'procedures' | 'general';
}

const shendetlabsInfo = {
  services: {
    title: "Our Services",
    content: `Shendetlabs offers comprehensive diagnostic services including:

🏠 **Home Sample Collection**: Convenient sample collection at your doorstep from 6:00 AM to 11:00 AM
🧪 **Medical Tests**: Complete range of blood tests, urine tests, and specialized diagnostics
📦 **Health Packages**: Curated health checkup packages for different age groups and health concerns
📊 **Fast Reports**: Digital reports delivered within 24-48 hours
👨‍⚕️ **Expert Consultation**: Access to qualified medical professionals for report interpretation

We serve patients across multiple cities with NABL-accredited laboratory services ensuring accuracy and reliability.`
  },
  
  policies: {
    title: "Policies & Guidelines",
    content: `Important policies for our patients:

📋 **Sample Collection**:
- Home collection available 6:00 AM - 11:00 AM
- Fasting requirements vary by test (we'll inform you)
- Valid ID required during collection
- Minimum 12-hour fasting for lipid profiles

💰 **Payment & Pricing**:
- Competitive pricing with occasional discounts
- Payment accepted: Cash, UPI, Cards
- Transparent pricing with no hidden charges
- Discounts available on health packages

📱 **Reports**:
- Digital reports via SMS/Email within 24-48 hours
- Physical reports available on request
- Report queries handled by our support team

🔄 **Cancellation & Rescheduling**:
- Free rescheduling up to 2 hours before appointment
- Cancellation allowed without charges if done 4+ hours in advance`
  },

  contact: {
    title: "Contact Information",
    content: `Get in touch with Shendetlabs:

📞 **Customer Care**: Available 24/7 for booking and queries
📱 **SMS Updates**: Automatic notifications for appointments and reports
🌐 **Online Booking**: Easy scheduling through our voice assistant
📍 **Service Areas**: We provide home collection services across major cities

For specific location coverage, appointment booking, or any queries about our services, our voice assistant can help you immediately. We're committed to providing convenient and reliable diagnostic services at your doorstep.`
  },

  accreditation: {
    title: "Accreditation & Quality",
    content: `Shendetlabs Quality Assurance:

🏆 **NABL Accredited**: Our laboratory is accredited by the National Accreditation Board for Testing and Calibration Laboratories
🔬 **Quality Standards**: Strict quality control measures for accurate results
👩‍🔬 **Expert Team**: Qualified pathologists and laboratory technicians
🛡️ **Safety Protocols**: Adherence to international safety and hygiene standards
📊 **Accuracy**: Regular quality checks and calibration of equipment

Your health reports are processed with the highest standards of accuracy and reliability. We maintain complete confidentiality of your medical information.`
  },

  procedures: {
    title: "Sample Collection Procedures",
    content: `What to expect during home collection:

📋 **Before Collection**:
- Our phlebotomist will call 30 minutes before arrival
- Ensure you've followed any fasting requirements
- Keep a valid ID ready for verification
- Prepare a clean, well-lit area for collection

🩸 **During Collection**:
- Professional, trained phlebotomist will collect samples
- Sterile equipment used for each collection
- Proper labeling and documentation
- Collection typically takes 10-15 minutes

📦 **After Collection**:
- Samples transported safely to our NABL-accredited lab
- Processing begins immediately upon receipt
- You'll receive SMS updates on report status
- Digital reports delivered within promised timeframe

Safety and hygiene are our top priorities during every collection.`
  },

  general: {
    title: "About Shendetlabs",
    content: `Shendetlabs - Your Trusted Diagnostic Partner

🎯 **Our Mission**: Making healthcare accessible through convenient, reliable diagnostic services
⭐ **Why Choose Us**:
- NABL-accredited laboratory ensuring quality
- Convenient home sample collection
- Fast and accurate reports
- Affordable pricing with transparent policies
- Professional and caring staff
- Digital-first approach for modern healthcare needs

🕐 **Operating Hours**:
- Customer Support: 24/7
- Sample Collection: 6:00 AM - 11:00 AM (Daily)
- Laboratory Operations: 24/7 processing

We believe in making healthcare simple, accessible, and reliable for everyone. Our voice assistant ZARA can help you with booking, queries, or any information about our services anytime.`
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, category }: KnowledgeRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📚 Knowledge base query:', query, 'Category:', category);

    const queryLower = query.toLowerCase();
    let response = '';
    let matchedCategories: string[] = [];

    // Search through all categories or specific category
    const categoriesToSearch = category ? [category] : Object.keys(shendetlabsInfo);

    for (const cat of categoriesToSearch) {
      const info = shendetlabsInfo[cat as keyof typeof shendetlabsInfo];
      if (!info) continue;

      // Check if query matches this category
      const titleMatch = info.title.toLowerCase().includes(queryLower);
      const contentMatch = info.content.toLowerCase().includes(queryLower);
      
      // Specific keyword matching
      const keywordMatches = (
        (queryLower.includes('service') && cat === 'services') ||
        (queryLower.includes('policy') && cat === 'policies') ||
        (queryLower.includes('contact') && cat === 'contact') ||
        (queryLower.includes('phone') && cat === 'contact') ||
        (queryLower.includes('nabl') && cat === 'accreditation') ||
        (queryLower.includes('quality') && cat === 'accreditation') ||
        (queryLower.includes('collection') && cat === 'procedures') ||
        (queryLower.includes('procedure') && cat === 'procedures') ||
        (queryLower.includes('about') && cat === 'general') ||
        (queryLower.includes('shendetlabs') && cat === 'general')
      );

      if (titleMatch || contentMatch || keywordMatches) {
        matchedCategories.push(cat);
        response += `\n\n**${info.title}**\n${info.content}`;
      }
    }

    // If no specific matches, provide general information
    if (!response) {
      const generalInfo = shendetlabsInfo.general;
      response = `\n\n**${generalInfo.title}**\n${generalInfo.content}`;
      matchedCategories = ['general'];
    }

    console.log('✅ Knowledge base response generated for:', query);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        information: response.trim(),
        matched_categories: matchedCategories,
        available_categories: Object.keys(shendetlabsInfo)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in shendetlabs-knowledge-base:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        information: "I'm sorry, I'm having trouble accessing our information database right now. Please let me know what specific information you need about Shendetlabs and I'll do my best to help you."
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);