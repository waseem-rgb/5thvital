import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PackageHero from '@/components/health-package/PackageHero';
import PackageTabs from '@/components/health-package/PackageTabs';
import HowItWorksSection from '@/components/health-package/HowItWorksSection';
import ImportantNoteBanner from '@/components/health-package/ImportantNoteBanner';
import { useToast } from '@/hooks/use-toast';

// Hardcoded package data for the 3 new health screening packages
const packageData = {
  'vital-health-basic': {
    id: 'pkg-1',
    name: 'Vital Health Check – Basic',
    alternateName: 'Start Your Health Journey with a Smart Basic Checkup',
    category: 'Essential Screening',
    originalPrice: 1499,
    price: 999,
    discount: 33,
    parametersCount: 60,
    reportTime: '6-8 hours',
    popularityText: 'Popular with first-time users',
    about: 'A compact yet powerful full body screening covering all major organs – blood counts, liver, kidney, cholesterol and diabetes risk – with NABL-grade testing and accurate reporting. Ideal for young adults and those looking for an annual basic health check.',
    parameterGroups: [
      {
        title: 'Complete Blood Count (CBC)',
        parameters: [
          'Haemoglobin',
          'Total WBC count',
          'Differential count (Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils)',
          'RBC count',
          'Packed Cell Volume (PCV)',
          'MCV, MCH, MCHC, RDW',
          'Platelet count',
          'Peripheral indices as per analyzer'
        ]
      },
      {
        title: 'Diabetes Screening',
        parameters: ['Fasting Blood Glucose']
      },
      {
        title: 'Lipid Profile',
        parameters: [
          'Total Cholesterol',
          'Triglycerides',
          'HDL Cholesterol',
          'LDL Cholesterol (calculated/direct)',
          'VLDL',
          'TC/HDL Ratio',
          'LDL/HDL Ratio'
        ]
      },
      {
        title: 'Liver Function Tests (LFT)',
        parameters: [
          'Total Bilirubin, Direct, Indirect',
          'SGOT (AST)',
          'SGPT (ALT)',
          'Alkaline Phosphatase',
          'Total Protein',
          'Albumin',
          'Globulin (calculated)',
          'A/G Ratio'
        ]
      },
      {
        title: 'Kidney Function Tests (KFT)',
        parameters: [
          'Blood Urea',
          'Serum Creatinine',
          'Uric Acid',
          'BUN / Creatinine Ratio',
          'eGFR'
        ]
      },
      {
        title: 'Urine Routine & Microscopy',
        parameters: [
          'Colour, Appearance',
          'pH, Specific Gravity',
          'Protein, Glucose, Ketones, Bilirubin',
          'Urobilinogen, Nitrite',
          'Microscopy: RBC, WBC, Epithelial cells, Casts, Crystals, Bacteria'
        ]
      },
      {
        title: 'Thyroid Basic',
        parameters: ['TSH']
      },
      {
        title: 'General Health Indicators',
        parameters: ['ESR']
      }
    ],
    preparation: [
      { title: 'Fasting Required', description: 'Preferably fast for 8-10 hours before sample collection (water is allowed)' },
      { title: 'Avoid Exercise', description: 'Avoid heavy exercise and alcohol 24 hours before the test' },
      { title: 'Continue Medicines', description: 'Continue regular medicines unless advised otherwise by your doctor' },
    ],
    whyTake: [
      'Adults 18-35 years looking for an annual health screening',
      'People with busy lifestyles, irregular sleep or mild stress',
      'First-time users who want a quick, affordable full body check',
      'Anyone planning to start diet, fitness or lifestyle modification',
    ],
    faqs: [
      { question: 'Do I need to be fasting?', answer: 'Yes, an 8-10 hour fasting period is recommended for accurate sugar and lipid values.' },
      { question: 'Is this enough as a yearly health check?', answer: 'For young, generally healthy individuals with no major risk factors, this is a good starting point. Your doctor may add more tests if needed.' },
      { question: 'Are reports doctor-verified?', answer: 'All tests are processed on advanced analyzers with multi-level quality checks. You should always consult your doctor for interpretation.' },
      { question: 'Can I upgrade later?', answer: 'Yes, you can opt for the Advanced or OncoProtect package in your next visit if you need deeper evaluation.' },
    ],
  },
  'vital-health-advanced': {
    id: 'pkg-2',
    name: 'Vital Health Check – Advanced',
    alternateName: 'Advanced Full Body Check for Today\'s Busy Professionals',
    category: 'Comprehensive Screening',
    originalPrice: 2199,
    price: 1499,
    discount: 32,
    parametersCount: 85,
    reportTime: '6-8 hours',
    popularityText: 'Most popular for working professionals',
    about: 'A comprehensive health package covering thyroid, vitamins, iron, cardiac risk and lifestyle-related parameters – designed for working individuals and those at higher metabolic risk. Includes everything in Basic plus expanded panels.',
    parameterGroups: [
      {
        title: 'All Tests from Basic Package',
        parameters: [
          'Complete Blood Count (CBC)',
          'Lipid Profile',
          'Liver Function Tests',
          'Kidney Function Tests',
          'Urine Routine',
          'Basic Thyroid (TSH)',
          'ESR'
        ]
      },
      {
        title: 'Complete Thyroid Profile',
        parameters: ['T3 (Total or Free)', 'T4 (Total or Free)', 'TSH']
      },
      {
        title: 'Expanded Diabetes Panel',
        parameters: ['Fasting Blood Glucose', 'HbA1c (Glycosylated Haemoglobin)']
      },
      {
        title: 'Vitamin Profile',
        parameters: ['Vitamin D (25-OH)', 'Vitamin B12']
      },
      {
        title: 'Iron Studies & Anaemia Profile',
        parameters: [
          'Serum Iron',
          'TIBC',
          'Transferrin Saturation (calculated)',
          'Serum Ferritin'
        ]
      },
      {
        title: 'Electrolytes',
        parameters: ['Sodium', 'Potassium', 'Chloride']
      },
      {
        title: 'Cardiac & Inflammation Marker',
        parameters: ['hs-CRP (High Sensitivity C-Reactive Protein)']
      },
      {
        title: 'Additional Tests',
        parameters: ['Serum Calcium', 'Serum Phosphorus']
      }
    ],
    preparation: [
      { title: 'Fasting Required', description: '8-10 hours fasting recommended' },
      { title: 'Inform About Medications', description: 'Inform our team if you are on thyroid, diabetes, or cardiac medicines' },
      { title: 'Avoid Supplements', description: 'Avoid supplements (especially biotin & vitamin tablets) 24 hours before, if possible and approved by your doctor' },
    ],
    whyTake: [
      'Age 25+ with a busy, stressful lifestyle',
      'People who are overweight/obese, have poor sleep or sedentary habits',
      'Those with family history of diabetes, thyroid disease, heart disease',
      'Individuals feeling fatigue, low energy, hair fall, mood changes, body aches',
      'Detects early thyroid dysfunction, vitamin deficiencies & anaemia',
      'Assesses cardiac risk and inflammation',
    ],
    faqs: [
      { question: 'How is this different from the Basic package?', answer: 'Advanced includes thyroid profile, vitamins, detailed iron studies, electrolytes and cardiac risk markers in addition to the Basic tests.' },
      { question: 'How often should I do this checkup?', answer: 'Typically once a year, or more frequently if advised by your doctor for existing conditions.' },
      { question: 'Is it suitable if I already have diabetes or thyroid issues?', answer: 'Yes, it\'s very useful to monitor control and treatment response – but medical advice should come from your treating doctor.' },
      { question: 'Can I see my reports on mobile?', answer: 'Yes, all reports are available securely on your mobile / email in a downloadable PDF.' },
    ],
  },
  'oncoprotect-comprehensive': {
    id: 'pkg-3',
    name: 'OncoProtect Full Body Check – Comprehensive',
    alternateName: 'Comprehensive Health Screening with Cancer Marker Evaluation',
    category: 'Premium Screening',
    originalPrice: 2999,
    price: 1999,
    discount: 33,
    parametersCount: 100,
    reportTime: '6-8 hours',
    popularityText: 'Recommended for 35+ age group',
    showCancerDisclaimer: true,
    about: 'A premium full body check that combines advanced metabolic, cardiac and organ function tests with selected tumour markers to support early risk detection under medical guidance. Includes all tests from Advanced package plus cancer markers and advanced cardiac panel.',
    parameterGroups: [
      {
        title: 'All Tests from Advanced Package',
        parameters: [
          'CBC, LFT, KFT, Lipid Profile',
          'Thyroid (T3, T4, TSH)',
          'Diabetes (FBS, HbA1c)',
          'Vitamins (D, B12)',
          'Iron profile, Electrolytes',
          'hs-CRP, Urine routine, ESR'
        ]
      },
      {
        title: 'Tumour / Cancer Markers',
        parameters: [
          'CEA (Carcinoembryonic Antigen) – general GI & smoking-related risk marker',
          'AFP (Alpha Fetoprotein) – liver/germ cell marker',
          'PSA (Total Prostatic Specific Antigen) – for male patients',
          'CA-125 – for female patients (pelvic/ovarian risk)'
        ]
      },
      {
        title: 'Advanced Cardiac Risk Panel',
        parameters: [
          'Lipoprotein(a) – Lp(a)',
          'Apolipoprotein A1',
          'Apolipoprotein B',
          'ApoB/ApoA1 Ratio'
        ]
      },
      {
        title: 'Additional Metabolic Markers',
        parameters: ['Fasting Insulin', 'HOMA-IR (calculated)']
      }
    ],
    preparation: [
      { title: 'Fasting Required', description: '8-10 hours fasting' },
      { title: 'Inform About Treatment', description: 'Inform your doctor & our team about any ongoing treatment, especially for known cancers or chronic illnesses' },
      { title: 'Women\'s Note', description: 'Women should ideally avoid CA-125 testing during menstruation to prevent false elevation' },
    ],
    whyTake: [
      'Age 35 years & above, especially with strong family history of cancer or heart disease',
      'Individuals with multiple risk factors – obesity, smoking, alcohol, high stress, diabetes, hypertension',
      'Those wanting a deep preventive health assessment once in 1-2 years',
      'People on long-term medications / chronic disease follow-up where more detailed assessment is useful',
    ],
    faqs: [
      { question: 'Does a normal tumour marker rule out cancer?', answer: 'No. Tumour markers are only supportive tests. Normal values do not completely rule out cancer and abnormal values do not always mean cancer. Clinical evaluation and imaging are essential.' },
      { question: 'How often should I do this package?', answer: 'Usually once in 1-2 years for high-risk individuals or as advised by your physician/oncologist.' },
      { question: 'Can this package replace a visit to the doctor?', answer: 'No. This is a diagnostic support tool. Always consult a qualified doctor to interpret results and plan further evaluation.' },
      { question: 'Are these tests safe?', answer: 'Yes, they are standard blood tests. Our phlebotomy and processing follow strict biosafety and NABL-aligned quality protocols.' },
    ],
  },
};

const HealthPackageDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const packageInfo = slug ? packageData[slug as keyof typeof packageData] : null;

  if (!packageInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Package Not Found</h1>
          <p className="text-gray-600 mb-6">The health package you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    toast({
      title: 'Added to Cart',
      description: `${packageInfo.name} has been added to your cart.`,
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Back Button */}
      <div className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <PackageHero packageInfo={packageInfo} onAddToCart={handleAddToCart} />

      {/* Cancer Marker Disclaimer (only for Comprehensive package) */}
      {'showCancerDisclaimer' in packageInfo && packageInfo.showCancerDisclaimer && (
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="max-w-5xl mx-auto">
            <ImportantNoteBanner />
          </div>
        </div>
      )}

      {/* Tabs Section */}
      <PackageTabs packageInfo={packageInfo} />

      {/* How It Works Section */}
      <HowItWorksSection />
    </div>
  );
};

export default HealthPackageDetails;
