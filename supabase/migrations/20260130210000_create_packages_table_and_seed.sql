-- ============================================================================
-- PACKAGES TABLE CREATION AND SEED DATA
-- ============================================================================
-- Creates public.packages table for health screening packages
-- Seeds 10 published packages with full data
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE PACKAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER,
    -- Pricing
    mrp NUMERIC(10, 2),
    price NUMERIC(10, 2),
    discount_percent NUMERIC(5, 2),
    -- Snapshot info
    reports_within_hours INTEGER,
    tests_included INTEGER,
    requisites TEXT,
    home_collection_minutes INTEGER,
    -- Content
    highlights TEXT,
    description TEXT,
    -- Structured data (JSONB)
    parameters JSONB DEFAULT '[]'::jsonb,
    faqs JSONB DEFAULT '[]'::jsonb,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_packages_slug ON public.packages(slug);
CREATE INDEX IF NOT EXISTS idx_packages_status ON public.packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_is_featured ON public.packages(is_featured);
CREATE INDEX IF NOT EXISTS idx_packages_sort_order ON public.packages(sort_order);

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Public read access for published packages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'packages' 
        AND policyname = 'packages_select_published_v1'
    ) THEN
        CREATE POLICY packages_select_published_v1 ON public.packages
            FOR SELECT
            USING (status = 'published');
    END IF;
END$$;

-- Admin full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'packages' 
        AND policyname = 'packages_admin_all_v1'
    ) THEN
        CREATE POLICY packages_admin_all_v1 ON public.packages
            FOR ALL
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END$$;

-- ============================================================================
-- SECTION 3: TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.packages_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_packages_updated_at'
    ) THEN
        CREATE TRIGGER trg_packages_updated_at
            BEFORE UPDATE ON public.packages
            FOR EACH ROW
            EXECUTE FUNCTION public.packages_set_updated_at();
    END IF;
END$$;

-- ============================================================================
-- SECTION 4: SEED 10 HEALTH SCREENING PACKAGES
-- ============================================================================

-- Clear existing data (if any) to ensure clean seed
DELETE FROM public.packages WHERE slug IN (
    'basic-health-checkup',
    'comprehensive-wellness',
    'cardiac-screening',
    'diabetes-care',
    'thyroid-profile',
    'vitamin-deficiency',
    'womens-health',
    'mens-health',
    'senior-citizen',
    'executive-health'
);

-- Package 1: Basic Health Checkup
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'basic-health-checkup',
    'Basic Health Checkup',
    'published',
    true,
    1,
    1499.00,
    999.00,
    33.00,
    24,
    35,
    '10-12 hours fasting required',
    15,
    'Ideal for annual health monitoring. Covers essential blood tests, liver & kidney function, and basic metabolic panel.',
    'The Basic Health Checkup is designed for individuals who want to keep track of their fundamental health markers. This package includes a complete blood count, lipid profile, liver function tests, kidney function tests, and blood glucose levels. Regular health checkups can help detect potential health issues before they become serious problems.

This package is recommended for adults aged 18 and above who want to establish baseline health metrics or monitor their ongoing health status. The tests included provide a comprehensive overview of your metabolic health, organ function, and overall well-being.',
    '[
        {
            "category": "Hematology",
            "count": 8,
            "items": [
                {"name": "Complete Blood Count (CBC)", "description": "Measures red and white blood cells, hemoglobin, and platelets"},
                {"name": "Hemoglobin", "description": "Oxygen-carrying protein in red blood cells"},
                {"name": "RBC Count", "description": "Red blood cell count"},
                {"name": "WBC Count", "description": "White blood cell count"},
                {"name": "Platelet Count", "description": "Blood clotting cells"},
                {"name": "Hematocrit", "description": "Percentage of blood volume occupied by red blood cells"},
                {"name": "MCV", "description": "Mean corpuscular volume"},
                {"name": "MCH", "description": "Mean corpuscular hemoglobin"}
            ]
        },
        {
            "category": "Lipid Profile",
            "count": 5,
            "items": [
                {"name": "Total Cholesterol", "description": "Total blood cholesterol level"},
                {"name": "LDL Cholesterol", "description": "Bad cholesterol"},
                {"name": "HDL Cholesterol", "description": "Good cholesterol"},
                {"name": "Triglycerides", "description": "Type of fat in blood"},
                {"name": "VLDL Cholesterol", "description": "Very low density lipoprotein"}
            ]
        },
        {
            "category": "Liver Function",
            "count": 7,
            "items": [
                {"name": "SGOT (AST)", "description": "Liver enzyme"},
                {"name": "SGPT (ALT)", "description": "Liver enzyme"},
                {"name": "Alkaline Phosphatase", "description": "Enzyme related to liver and bones"},
                {"name": "Total Bilirubin", "description": "Waste product from red blood cell breakdown"},
                {"name": "Direct Bilirubin", "description": "Processed bilirubin"},
                {"name": "Total Protein", "description": "Protein levels in blood"},
                {"name": "Albumin", "description": "Main protein made by liver"}
            ]
        },
        {
            "category": "Kidney Function",
            "count": 5,
            "items": [
                {"name": "Blood Urea Nitrogen (BUN)", "description": "Waste product from protein metabolism"},
                {"name": "Creatinine", "description": "Waste product from muscle metabolism"},
                {"name": "Uric Acid", "description": "Waste product from purine metabolism"},
                {"name": "BUN/Creatinine Ratio", "description": "Kidney function indicator"},
                {"name": "eGFR", "description": "Estimated glomerular filtration rate"}
            ]
        },
        {
            "category": "Diabetes Screening",
            "count": 2,
            "items": [
                {"name": "Fasting Blood Glucose", "description": "Blood sugar level after fasting"},
                {"name": "HbA1c", "description": "Average blood sugar over 2-3 months"}
            ]
        },
        {
            "category": "Urine Analysis",
            "count": 8,
            "items": [
                {"name": "Urine Routine", "description": "Physical and chemical examination of urine"},
                {"name": "Urine pH", "description": "Acidity of urine"},
                {"name": "Urine Specific Gravity", "description": "Concentration of urine"},
                {"name": "Urine Protein", "description": "Protein in urine"},
                {"name": "Urine Glucose", "description": "Sugar in urine"},
                {"name": "Urine Ketones", "description": "Ketone bodies in urine"},
                {"name": "Urine Blood", "description": "Blood in urine"},
                {"name": "Urine Microscopy", "description": "Microscopic examination of urine sediment"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "Do I need to fast before this test?", "answer": "Yes, 10-12 hours of fasting is required for accurate results. You can drink water during the fasting period."},
        {"question": "How long will it take to get my reports?", "answer": "Reports are typically available within 24 hours of sample collection."},
        {"question": "Can I take my regular medications before the test?", "answer": "Please consult with your doctor about any medications. Generally, essential medications can be taken with a small sip of water."},
        {"question": "Is home sample collection available?", "answer": "Yes, our trained phlebotomist will visit your home for sample collection. The process takes approximately 15 minutes."}
    ]'::jsonb
);

-- Package 2: Comprehensive Wellness Package
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'comprehensive-wellness',
    'Comprehensive Wellness Package',
    'published',
    true,
    2,
    4999.00,
    3499.00,
    30.00,
    48,
    78,
    '10-12 hours fasting required',
    20,
    'Complete health assessment including thyroid, vitamins, cardiac markers, and hormonal profile. Best value for thorough screening.',
    'The Comprehensive Wellness Package is our most popular health screening option, designed to provide a 360-degree view of your health. This extensive package covers all major organ systems and includes advanced tests for early detection of chronic conditions.

In addition to basic health parameters, this package includes thyroid function tests, vitamin levels (B12, D, Iron), cardiac risk markers, and inflammatory markers. This package is ideal for individuals above 30 years or those with a family history of lifestyle diseases. Regular comprehensive screening helps in early detection and prevention of serious health conditions.',
    '[
        {
            "category": "Complete Blood Count",
            "count": 12,
            "items": [
                {"name": "Hemoglobin", "description": "Oxygen-carrying protein"},
                {"name": "RBC Count", "description": "Red blood cell count"},
                {"name": "WBC Count", "description": "White blood cell count"},
                {"name": "Platelet Count", "description": "Blood clotting cells"},
                {"name": "PCV/Hematocrit", "description": "Packed cell volume"},
                {"name": "MCV", "description": "Mean corpuscular volume"},
                {"name": "MCH", "description": "Mean corpuscular hemoglobin"},
                {"name": "MCHC", "description": "Mean corpuscular hemoglobin concentration"},
                {"name": "RDW", "description": "Red cell distribution width"},
                {"name": "Neutrophils", "description": "Type of white blood cell"},
                {"name": "Lymphocytes", "description": "Type of white blood cell"},
                {"name": "ESR", "description": "Erythrocyte sedimentation rate"}
            ]
        },
        {
            "category": "Lipid Profile",
            "count": 8,
            "items": [
                {"name": "Total Cholesterol", "description": "Total blood cholesterol"},
                {"name": "LDL Cholesterol", "description": "Bad cholesterol"},
                {"name": "HDL Cholesterol", "description": "Good cholesterol"},
                {"name": "Triglycerides", "description": "Blood fats"},
                {"name": "VLDL", "description": "Very low density lipoprotein"},
                {"name": "LDL/HDL Ratio", "description": "Cholesterol ratio"},
                {"name": "Total Cholesterol/HDL Ratio", "description": "Risk ratio"},
                {"name": "Non-HDL Cholesterol", "description": "All bad cholesterol combined"}
            ]
        },
        {
            "category": "Thyroid Profile",
            "count": 5,
            "items": [
                {"name": "TSH", "description": "Thyroid stimulating hormone"},
                {"name": "T3 Total", "description": "Triiodothyronine"},
                {"name": "T4 Total", "description": "Thyroxine"},
                {"name": "Free T3", "description": "Active T3"},
                {"name": "Free T4", "description": "Active T4"}
            ]
        },
        {
            "category": "Liver Function",
            "count": 12,
            "items": [
                {"name": "SGOT (AST)", "description": "Liver enzyme"},
                {"name": "SGPT (ALT)", "description": "Liver enzyme"},
                {"name": "Alkaline Phosphatase", "description": "Liver/bone enzyme"},
                {"name": "GGT", "description": "Gamma-glutamyl transferase"},
                {"name": "Total Bilirubin", "description": "Bile pigment"},
                {"name": "Direct Bilirubin", "description": "Conjugated bilirubin"},
                {"name": "Indirect Bilirubin", "description": "Unconjugated bilirubin"},
                {"name": "Total Protein", "description": "Blood proteins"},
                {"name": "Albumin", "description": "Main blood protein"},
                {"name": "Globulin", "description": "Immune proteins"},
                {"name": "A/G Ratio", "description": "Albumin to globulin ratio"},
                {"name": "LDH", "description": "Lactate dehydrogenase"}
            ]
        },
        {
            "category": "Kidney Function",
            "count": 6,
            "items": [
                {"name": "Blood Urea", "description": "Waste product"},
                {"name": "Creatinine", "description": "Kidney function marker"},
                {"name": "Uric Acid", "description": "Purine metabolism"},
                {"name": "BUN", "description": "Blood urea nitrogen"},
                {"name": "eGFR", "description": "Kidney filtration rate"},
                {"name": "BUN/Creatinine Ratio", "description": "Kidney indicator"}
            ]
        },
        {
            "category": "Diabetes Panel",
            "count": 4,
            "items": [
                {"name": "Fasting Glucose", "description": "Blood sugar fasting"},
                {"name": "HbA1c", "description": "3-month average sugar"},
                {"name": "Fasting Insulin", "description": "Insulin levels"},
                {"name": "HOMA-IR", "description": "Insulin resistance index"}
            ]
        },
        {
            "category": "Vitamin & Mineral Panel",
            "count": 6,
            "items": [
                {"name": "Vitamin D (25-OH)", "description": "Vitamin D level"},
                {"name": "Vitamin B12", "description": "Cobalamin level"},
                {"name": "Folate", "description": "Folic acid level"},
                {"name": "Iron", "description": "Iron level"},
                {"name": "Ferritin", "description": "Iron storage"},
                {"name": "TIBC", "description": "Total iron binding capacity"}
            ]
        },
        {
            "category": "Cardiac Markers",
            "count": 4,
            "items": [
                {"name": "hs-CRP", "description": "High-sensitivity C-reactive protein"},
                {"name": "Homocysteine", "description": "Amino acid linked to heart disease"},
                {"name": "Lipoprotein(a)", "description": "Genetic cardiovascular risk marker"},
                {"name": "Apolipoprotein B", "description": "Carrier of bad cholesterol"}
            ]
        },
        {
            "category": "Inflammatory Markers",
            "count": 3,
            "items": [
                {"name": "CRP", "description": "C-reactive protein"},
                {"name": "ESR", "description": "Sedimentation rate"},
                {"name": "RA Factor", "description": "Rheumatoid arthritis marker"}
            ]
        },
        {
            "category": "Electrolytes",
            "count": 5,
            "items": [
                {"name": "Sodium", "description": "Electrolyte balance"},
                {"name": "Potassium", "description": "Electrolyte balance"},
                {"name": "Chloride", "description": "Electrolyte balance"},
                {"name": "Calcium", "description": "Bone mineral"},
                {"name": "Phosphorus", "description": "Bone mineral"}
            ]
        },
        {
            "category": "Urine Analysis",
            "count": 13,
            "items": [
                {"name": "Urine Complete Analysis", "description": "Physical examination"},
                {"name": "pH", "description": "Acidity"},
                {"name": "Specific Gravity", "description": "Concentration"},
                {"name": "Protein", "description": "Protein in urine"},
                {"name": "Glucose", "description": "Sugar in urine"},
                {"name": "Ketones", "description": "Ketone bodies"},
                {"name": "Blood", "description": "Blood in urine"},
                {"name": "Bilirubin", "description": "Bile pigment"},
                {"name": "Urobilinogen", "description": "Bilirubin breakdown"},
                {"name": "Nitrite", "description": "Bacterial infection marker"},
                {"name": "Leukocyte Esterase", "description": "WBC marker"},
                {"name": "RBCs", "description": "Red blood cells"},
                {"name": "Pus Cells", "description": "White blood cells"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "Who should get this package?", "answer": "This package is ideal for individuals above 30 years, those with family history of chronic diseases, or anyone wanting a comprehensive health assessment."},
        {"question": "How often should I repeat this test?", "answer": "We recommend annual testing for most individuals. Those with existing conditions may need more frequent monitoring as advised by their doctor."},
        {"question": "What preparations are needed?", "answer": "Fasting for 10-12 hours is required. Avoid alcohol for 24 hours before the test. Continue regular medications unless advised otherwise by your doctor."},
        {"question": "Can I customize this package?", "answer": "Yes, you can add specific tests to this package. Contact our team for customization options."},
        {"question": "Is consultation included?", "answer": "Yes, this package includes a free telephonic consultation with our medical expert to explain your reports."}
    ]'::jsonb
);

-- Package 3: Cardiac Screening Package
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'cardiac-screening',
    'Cardiac Screening Package',
    'published',
    true,
    3,
    3999.00,
    2799.00,
    30.00,
    24,
    42,
    '10-12 hours fasting required',
    15,
    'Advanced heart health assessment including lipid profile, cardiac enzymes, inflammatory markers, and ECG. Essential for heart disease prevention.',
    'The Cardiac Screening Package is designed for early detection and prevention of cardiovascular diseases. Heart disease remains one of the leading causes of mortality worldwide, and early detection through comprehensive screening can significantly reduce risks.

This package includes advanced lipid profile, cardiac-specific enzymes and markers, inflammatory markers associated with cardiovascular risk, and essential metabolic parameters. It is highly recommended for individuals with family history of heart disease, those with sedentary lifestyle, smokers, and anyone above 40 years of age.',
    '[
        {
            "category": "Advanced Lipid Profile",
            "count": 10,
            "items": [
                {"name": "Total Cholesterol", "description": "Total blood cholesterol"},
                {"name": "LDL Cholesterol (Direct)", "description": "Direct measurement of bad cholesterol"},
                {"name": "HDL Cholesterol", "description": "Good cholesterol"},
                {"name": "Triglycerides", "description": "Blood fats"},
                {"name": "VLDL", "description": "Very low density lipoprotein"},
                {"name": "Non-HDL Cholesterol", "description": "All atherogenic lipoproteins"},
                {"name": "LDL/HDL Ratio", "description": "Cardiovascular risk ratio"},
                {"name": "Apolipoprotein A1", "description": "Protein in HDL"},
                {"name": "Apolipoprotein B", "description": "Protein in LDL"},
                {"name": "Lipoprotein(a)", "description": "Genetic cardiovascular risk marker"}
            ]
        },
        {
            "category": "Cardiac Enzymes",
            "count": 5,
            "items": [
                {"name": "Troponin I", "description": "Heart muscle damage marker"},
                {"name": "CK-MB", "description": "Creatine kinase heart specific"},
                {"name": "LDH", "description": "Lactate dehydrogenase"},
                {"name": "Pro-BNP", "description": "Heart failure marker"},
                {"name": "Myoglobin", "description": "Muscle protein marker"}
            ]
        },
        {
            "category": "Inflammatory Markers",
            "count": 4,
            "items": [
                {"name": "hs-CRP", "description": "High-sensitivity C-reactive protein for cardiac risk"},
                {"name": "Homocysteine", "description": "Amino acid linked to heart disease"},
                {"name": "Fibrinogen", "description": "Blood clotting factor"},
                {"name": "ESR", "description": "Inflammation marker"}
            ]
        },
        {
            "category": "Diabetes & Metabolic",
            "count": 5,
            "items": [
                {"name": "Fasting Glucose", "description": "Blood sugar level"},
                {"name": "HbA1c", "description": "Long-term glucose control"},
                {"name": "Fasting Insulin", "description": "Insulin level"},
                {"name": "HOMA-IR", "description": "Insulin resistance calculation"},
                {"name": "Uric Acid", "description": "Gout and cardiovascular risk marker"}
            ]
        },
        {
            "category": "Electrolytes",
            "count": 5,
            "items": [
                {"name": "Sodium", "description": "Important for heart rhythm"},
                {"name": "Potassium", "description": "Critical for heart function"},
                {"name": "Chloride", "description": "Electrolyte balance"},
                {"name": "Calcium", "description": "Heart contraction"},
                {"name": "Magnesium", "description": "Heart rhythm regulation"}
            ]
        },
        {
            "category": "Kidney Function",
            "count": 4,
            "items": [
                {"name": "Creatinine", "description": "Kidney function"},
                {"name": "eGFR", "description": "Kidney filtration rate"},
                {"name": "Urea", "description": "Kidney waste product"},
                {"name": "Microalbumin/Creatinine Ratio", "description": "Early kidney damage marker"}
            ]
        },
        {
            "category": "Thyroid Panel",
            "count": 3,
            "items": [
                {"name": "TSH", "description": "Thyroid affects heart rate"},
                {"name": "Free T3", "description": "Active thyroid hormone"},
                {"name": "Free T4", "description": "Thyroid hormone"}
            ]
        },
        {
            "category": "Liver Function",
            "count": 4,
            "items": [
                {"name": "SGOT", "description": "Also elevated in heart damage"},
                {"name": "SGPT", "description": "Liver enzyme"},
                {"name": "GGT", "description": "Cardiovascular risk marker"},
                {"name": "Alkaline Phosphatase", "description": "Liver and bone health"}
            ]
        },
        {
            "category": "Complete Blood Count",
            "count": 2,
            "items": [
                {"name": "Hemoglobin", "description": "Oxygen carrying capacity"},
                {"name": "Platelet Count", "description": "Blood clotting"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "Who needs cardiac screening?", "answer": "Anyone above 40 years, those with family history of heart disease, diabetics, smokers, overweight individuals, and those with high stress levels should consider cardiac screening."},
        {"question": "How is this different from basic lipid profile?", "answer": "This package includes advanced cardiac markers like Apolipoprotein B, Lipoprotein(a), hs-CRP, and Homocysteine which provide deeper insights into cardiovascular risk beyond basic cholesterol levels."},
        {"question": "Does this package include ECG?", "answer": "The blood test package does not include ECG. However, you can add ECG as an additional test. We recommend consulting with a cardiologist for comprehensive cardiac evaluation."},
        {"question": "What lifestyle changes can help improve results?", "answer": "Regular exercise, balanced diet low in saturated fats, smoking cessation, stress management, and maintaining healthy weight can significantly improve cardiac health markers."}
    ]'::jsonb
);

-- Package 4: Diabetes Care Package
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'diabetes-care',
    'Diabetes Care Package',
    'published',
    false,
    4,
    2499.00,
    1799.00,
    28.00,
    24,
    32,
    '10-12 hours fasting required',
    15,
    'Complete diabetes monitoring including glucose levels, HbA1c, insulin resistance, kidney function, and lipid profile. Ideal for diabetics and pre-diabetics.',
    'The Diabetes Care Package is specifically designed for individuals diagnosed with diabetes or those at risk of developing diabetes (pre-diabetes). This comprehensive package monitors all aspects affected by diabetes and helps in effective management of the condition.

Diabetes can affect multiple organs including kidneys, eyes, heart, and nerves. This package includes tests to monitor blood sugar control, assess kidney function (commonly affected in diabetics), evaluate cardiovascular risk factors, and check for nutritional deficiencies common in diabetics. Regular monitoring is essential for preventing diabetes complications.',
    '[
        {
            "category": "Glucose Monitoring",
            "count": 5,
            "items": [
                {"name": "Fasting Blood Glucose", "description": "Sugar level after fasting"},
                {"name": "Post Prandial Glucose", "description": "Sugar level 2 hours after meal"},
                {"name": "HbA1c", "description": "3-month average blood sugar"},
                {"name": "Fasting Insulin", "description": "Insulin production"},
                {"name": "HOMA-IR", "description": "Insulin resistance index"}
            ]
        },
        {
            "category": "Kidney Function (Diabetic Nephropathy)",
            "count": 6,
            "items": [
                {"name": "Creatinine", "description": "Kidney function"},
                {"name": "Blood Urea", "description": "Kidney waste"},
                {"name": "eGFR", "description": "Kidney filtration rate"},
                {"name": "Uric Acid", "description": "Gout risk marker"},
                {"name": "Microalbumin", "description": "Early kidney damage in diabetes"},
                {"name": "Albumin/Creatinine Ratio", "description": "Kidney damage indicator"}
            ]
        },
        {
            "category": "Lipid Profile",
            "count": 7,
            "items": [
                {"name": "Total Cholesterol", "description": "Total cholesterol"},
                {"name": "LDL Cholesterol", "description": "Bad cholesterol - often elevated in diabetes"},
                {"name": "HDL Cholesterol", "description": "Good cholesterol - often low in diabetes"},
                {"name": "Triglycerides", "description": "Often elevated in diabetics"},
                {"name": "VLDL", "description": "Very low density lipoprotein"},
                {"name": "LDL/HDL Ratio", "description": "Cardiovascular risk"},
                {"name": "Non-HDL Cholesterol", "description": "All bad cholesterol"}
            ]
        },
        {
            "category": "Liver Function",
            "count": 5,
            "items": [
                {"name": "SGOT", "description": "Liver enzyme"},
                {"name": "SGPT", "description": "Liver enzyme - fatty liver common in diabetes"},
                {"name": "GGT", "description": "Liver enzyme"},
                {"name": "Alkaline Phosphatase", "description": "Liver/bone enzyme"},
                {"name": "Total Bilirubin", "description": "Liver function"}
            ]
        },
        {
            "category": "Vitamins & Minerals",
            "count": 4,
            "items": [
                {"name": "Vitamin B12", "description": "Often deficient with Metformin use"},
                {"name": "Vitamin D", "description": "Important for insulin sensitivity"},
                {"name": "Magnesium", "description": "Often low in diabetics"},
                {"name": "Zinc", "description": "Important for wound healing"}
            ]
        },
        {
            "category": "Complete Blood Count",
            "count": 3,
            "items": [
                {"name": "Hemoglobin", "description": "Anemia screening"},
                {"name": "WBC Count", "description": "Infection indicator"},
                {"name": "Platelet Count", "description": "Blood clotting"}
            ]
        },
        {
            "category": "Urine Analysis",
            "count": 2,
            "items": [
                {"name": "Urine Routine", "description": "Complete urine examination"},
                {"name": "Urine Glucose", "description": "Sugar spillover in urine"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "How often should diabetics get tested?", "answer": "Diabetics should get HbA1c tested every 3 months and comprehensive screening every 6 months to monitor disease progression and complications."},
        {"question": "What is HbA1c and why is it important?", "answer": "HbA1c (Glycated Hemoglobin) measures your average blood sugar over the past 2-3 months. It is the gold standard for monitoring diabetes control. Target is usually below 7% for most diabetics."},
        {"question": "Why are kidney tests included?", "answer": "Diabetes is the leading cause of kidney disease. Early detection of kidney damage through microalbumin testing allows for timely intervention to prevent progression."},
        {"question": "Should I stop diabetes medications before the test?", "answer": "No, continue your regular diabetes medications unless specifically advised by your doctor. Stopping medications can cause dangerous blood sugar fluctuations."}
    ]'::jsonb
);

-- Package 5: Thyroid Profile Complete
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'thyroid-profile',
    'Thyroid Profile Complete',
    'published',
    false,
    5,
    1999.00,
    1399.00,
    30.00,
    24,
    12,
    'No fasting required',
    10,
    'Complete thyroid function assessment including TSH, T3, T4, and thyroid antibodies. Essential for thyroid disorder monitoring.',
    'The Thyroid Profile Complete package provides comprehensive assessment of thyroid function. The thyroid gland plays a crucial role in metabolism, energy production, heart function, brain development, and overall hormonal balance.

This package includes all essential thyroid hormones and antibodies to detect both hypothyroidism (underactive thyroid) and hyperthyroidism (overactive thyroid), as well as autoimmune thyroid conditions like Hashimoto''s thyroiditis and Graves'' disease. Early detection and proper management of thyroid disorders is essential as they can affect multiple body systems.',
    '[
        {
            "category": "Thyroid Hormones",
            "count": 5,
            "items": [
                {"name": "TSH (Thyroid Stimulating Hormone)", "description": "Primary thyroid screening test"},
                {"name": "Total T3", "description": "Total triiodothyronine"},
                {"name": "Total T4", "description": "Total thyroxine"},
                {"name": "Free T3", "description": "Active T3 hormone"},
                {"name": "Free T4", "description": "Active T4 hormone"}
            ]
        },
        {
            "category": "Thyroid Antibodies",
            "count": 3,
            "items": [
                {"name": "Anti-TPO Antibodies", "description": "Thyroid peroxidase antibodies - Hashimoto''s marker"},
                {"name": "Anti-Thyroglobulin Antibodies", "description": "Autoimmune thyroid disease marker"},
                {"name": "TSH Receptor Antibodies", "description": "Graves'' disease marker"}
            ]
        },
        {
            "category": "Thyroid Tumor Marker",
            "count": 1,
            "items": [
                {"name": "Thyroglobulin", "description": "Thyroid tissue marker"}
            ]
        },
        {
            "category": "Related Tests",
            "count": 3,
            "items": [
                {"name": "Vitamin D", "description": "Often low in thyroid patients"},
                {"name": "Vitamin B12", "description": "Related deficiency common"},
                {"name": "Calcium", "description": "Thyroid affects calcium metabolism"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "What are symptoms of thyroid problems?", "answer": "Hypothyroidism symptoms include fatigue, weight gain, cold sensitivity, dry skin, and constipation. Hyperthyroidism symptoms include weight loss, rapid heartbeat, anxiety, and heat sensitivity."},
        {"question": "Do I need to fast for thyroid tests?", "answer": "No fasting is required for thyroid tests. However, it''s best to test in the morning and inform the lab if you take thyroid medications."},
        {"question": "Can thyroid problems be cured?", "answer": "Most thyroid conditions can be effectively managed with medication. Regular monitoring through blood tests helps ensure optimal treatment dosing."},
        {"question": "Why are antibody tests important?", "answer": "Antibody tests help identify autoimmune thyroid disease, which is the most common cause of thyroid disorders. They help predict disease progression and guide treatment decisions."}
    ]'::jsonb
);

-- Package 6: Vitamin Deficiency Panel
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'vitamin-deficiency',
    'Vitamin Deficiency Panel',
    'published',
    false,
    6,
    3499.00,
    2499.00,
    29.00,
    48,
    18,
    'No fasting required',
    10,
    'Comprehensive vitamin and mineral assessment. Includes Vitamin D, B12, B complex, Iron studies, Calcium, Magnesium, and Zinc.',
    'The Vitamin Deficiency Panel is designed to identify common nutritional deficiencies that can lead to various health problems. Modern lifestyles, dietary habits, and certain medical conditions can lead to vitamin and mineral deficiencies even in individuals who appear healthy.

This package covers all essential vitamins and minerals including Vitamin D (deficient in over 70% of Indians), Vitamin B12 (especially important for vegetarians), Iron studies (for anemia), and other crucial micronutrients. Identifying and correcting deficiencies can significantly improve energy levels, immune function, bone health, and overall well-being.',
    '[
        {
            "category": "Fat-Soluble Vitamins",
            "count": 4,
            "items": [
                {"name": "Vitamin D (25-Hydroxy)", "description": "Essential for bones, immunity, and mood"},
                {"name": "Vitamin A", "description": "Vision, skin, and immune health"},
                {"name": "Vitamin E", "description": "Antioxidant vitamin"},
                {"name": "Vitamin K", "description": "Blood clotting and bone health"}
            ]
        },
        {
            "category": "B-Complex Vitamins",
            "count": 5,
            "items": [
                {"name": "Vitamin B12", "description": "Nerve function and red blood cells"},
                {"name": "Folic Acid (B9)", "description": "Cell division and DNA synthesis"},
                {"name": "Vitamin B6", "description": "Protein metabolism and brain function"},
                {"name": "Vitamin B1 (Thiamine)", "description": "Energy metabolism"},
                {"name": "Vitamin B2 (Riboflavin)", "description": "Energy production"}
            ]
        },
        {
            "category": "Iron Studies",
            "count": 4,
            "items": [
                {"name": "Serum Iron", "description": "Iron in blood"},
                {"name": "Ferritin", "description": "Iron storage"},
                {"name": "TIBC", "description": "Total iron binding capacity"},
                {"name": "Transferrin Saturation", "description": "Iron transport efficiency"}
            ]
        },
        {
            "category": "Minerals",
            "count": 5,
            "items": [
                {"name": "Calcium", "description": "Bone health and muscle function"},
                {"name": "Magnesium", "description": "Nerve and muscle function"},
                {"name": "Zinc", "description": "Immunity and wound healing"},
                {"name": "Phosphorus", "description": "Bone mineralization"},
                {"name": "Copper", "description": "Iron metabolism and connective tissue"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "Who should get this test?", "answer": "Anyone experiencing fatigue, weakness, hair loss, brittle nails, frequent infections, or unexplained symptoms should consider this panel. It''s also recommended for vegetarians, elderly, and those with restricted diets."},
        {"question": "Can deficiencies be corrected with diet alone?", "answer": "Mild deficiencies can often be corrected through dietary changes. Severe deficiencies may require supplementation under medical guidance. The test results help determine the best approach."},
        {"question": "How long does it take to correct deficiencies?", "answer": "It varies by deficiency and severity. Vitamin D typically takes 2-3 months, B12 may take 3-6 months, and iron deficiency 3-6 months to correct. Regular monitoring is important."},
        {"question": "Is fasting required for this test?", "answer": "No fasting is required for the vitamin deficiency panel. You can take the test at any time of the day."}
    ]'::jsonb
);

-- Package 7: Women's Health Package
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'womens-health',
    'Women''s Health Package',
    'published',
    true,
    7,
    4499.00,
    3199.00,
    29.00,
    48,
    52,
    '10-12 hours fasting required',
    20,
    'Comprehensive health screening designed specifically for women. Includes hormonal profile, thyroid, anemia screening, bone health markers, and complete metabolic panel.',
    'The Women''s Health Package is specifically curated to address the unique health needs of women at different life stages. Women have specific health concerns including hormonal imbalances, anemia, thyroid disorders, osteoporosis risk, and certain nutritional deficiencies that require targeted screening.

This comprehensive package includes complete blood count with focus on anemia indicators, thyroid function (women are 5-8 times more likely to have thyroid issues), hormonal profile, bone health markers including Vitamin D and Calcium, iron studies, and metabolic screening. Regular screening helps in early detection of conditions common in women and enables timely intervention.',
    '[
        {
            "category": "Hormonal Profile",
            "count": 6,
            "items": [
                {"name": "FSH", "description": "Follicle stimulating hormone"},
                {"name": "LH", "description": "Luteinizing hormone"},
                {"name": "Estradiol", "description": "Primary female hormone"},
                {"name": "Progesterone", "description": "Fertility and pregnancy hormone"},
                {"name": "Prolactin", "description": "Breast milk and reproductive hormone"},
                {"name": "AMH", "description": "Anti-Mullerian hormone - ovarian reserve"}
            ]
        },
        {
            "category": "Thyroid Profile",
            "count": 5,
            "items": [
                {"name": "TSH", "description": "Thyroid stimulating hormone"},
                {"name": "Free T3", "description": "Active thyroid hormone"},
                {"name": "Free T4", "description": "Thyroid hormone"},
                {"name": "Anti-TPO", "description": "Thyroid antibodies"},
                {"name": "Anti-TG", "description": "Thyroglobulin antibodies"}
            ]
        },
        {
            "category": "Anemia Panel",
            "count": 8,
            "items": [
                {"name": "Hemoglobin", "description": "Oxygen carrying protein"},
                {"name": "RBC Count", "description": "Red blood cells"},
                {"name": "MCV", "description": "Red cell size"},
                {"name": "MCH", "description": "Hemoglobin per cell"},
                {"name": "Serum Iron", "description": "Iron level"},
                {"name": "Ferritin", "description": "Iron storage"},
                {"name": "TIBC", "description": "Iron binding capacity"},
                {"name": "Vitamin B12", "description": "B12 deficiency causes anemia"}
            ]
        },
        {
            "category": "Bone Health",
            "count": 4,
            "items": [
                {"name": "Vitamin D", "description": "Essential for calcium absorption"},
                {"name": "Calcium", "description": "Bone mineral"},
                {"name": "Phosphorus", "description": "Bone strength"},
                {"name": "Alkaline Phosphatase", "description": "Bone turnover marker"}
            ]
        },
        {
            "category": "Lipid Profile",
            "count": 6,
            "items": [
                {"name": "Total Cholesterol", "description": "Total cholesterol"},
                {"name": "LDL Cholesterol", "description": "Bad cholesterol"},
                {"name": "HDL Cholesterol", "description": "Good cholesterol"},
                {"name": "Triglycerides", "description": "Blood fats"},
                {"name": "VLDL", "description": "Very low density lipoprotein"},
                {"name": "Non-HDL Cholesterol", "description": "Cardiovascular risk marker"}
            ]
        },
        {
            "category": "Liver Function",
            "count": 6,
            "items": [
                {"name": "SGOT", "description": "Liver enzyme"},
                {"name": "SGPT", "description": "Liver enzyme"},
                {"name": "GGT", "description": "Liver enzyme"},
                {"name": "Total Bilirubin", "description": "Liver function"},
                {"name": "Total Protein", "description": "Protein level"},
                {"name": "Albumin", "description": "Liver protein"}
            ]
        },
        {
            "category": "Kidney Function",
            "count": 4,
            "items": [
                {"name": "Creatinine", "description": "Kidney function"},
                {"name": "Urea", "description": "Kidney waste"},
                {"name": "eGFR", "description": "Filtration rate"},
                {"name": "Uric Acid", "description": "Joint health"}
            ]
        },
        {
            "category": "Diabetes Screening",
            "count": 3,
            "items": [
                {"name": "Fasting Glucose", "description": "Blood sugar"},
                {"name": "HbA1c", "description": "Average blood sugar"},
                {"name": "Fasting Insulin", "description": "PCOS indicator"}
            ]
        },
        {
            "category": "Inflammatory Marker",
            "count": 2,
            "items": [
                {"name": "ESR", "description": "Inflammation marker"},
                {"name": "hs-CRP", "description": "High-sensitivity CRP"}
            ]
        },
        {
            "category": "Urine Analysis",
            "count": 8,
            "items": [
                {"name": "Urine Routine", "description": "Complete urine test"},
                {"name": "pH", "description": "Urine acidity"},
                {"name": "Protein", "description": "Kidney health"},
                {"name": "Glucose", "description": "Diabetes indicator"},
                {"name": "Blood", "description": "UTI/kidney indicator"},
                {"name": "Pus Cells", "description": "Infection marker"},
                {"name": "Epithelial Cells", "description": "Contamination/infection"},
                {"name": "Culture if needed", "description": "Bacterial identification"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "At what age should women start health screening?", "answer": "Regular health screening should start at age 18-20 with basic tests. More comprehensive screening including hormonal tests becomes important after 30, especially if planning pregnancy or experiencing symptoms."},
        {"question": "Is this package suitable during pregnancy?", "answer": "This package is designed for non-pregnant women. Pregnant women require different tests (antenatal profile). Please inform us if you are pregnant or suspect pregnancy."},
        {"question": "Why are hormonal tests included?", "answer": "Hormonal imbalances can cause various issues like irregular periods, PCOS, infertility, and menopausal symptoms. Early detection helps in timely treatment."},
        {"question": "How does this help with PCOS detection?", "answer": "The hormonal profile (FSH, LH ratio), insulin levels, and AMH help in diagnosing PCOS. Combined with clinical assessment, these tests form the basis for PCOS diagnosis and management."},
        {"question": "When should I take this test in my menstrual cycle?", "answer": "For accurate hormonal assessment, tests are best done on Day 2-5 of your menstrual cycle for FSH, LH, and Estradiol. Other tests can be done anytime."}
    ]'::jsonb
);

-- Package 8: Men's Health Package
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'mens-health',
    'Men''s Health Package',
    'published',
    false,
    8,
    3999.00,
    2899.00,
    28.00,
    48,
    48,
    '10-12 hours fasting required',
    20,
    'Comprehensive health screening for men including PSA for prostate health, testosterone levels, cardiac markers, and complete metabolic panel.',
    'The Men''s Health Package is designed to address health concerns specific to men. Men are often at higher risk for cardiovascular disease, have unique hormonal considerations, and face prostate health concerns as they age.

This comprehensive package includes PSA (Prostate Specific Antigen) for prostate cancer screening, testosterone and DHEA-S for hormonal health, advanced cardiac risk markers, and complete metabolic screening. Regular screening is especially important for men above 40 years, those with sedentary lifestyle, family history of prostate or heart disease.',
    '[
        {
            "category": "Prostate Health",
            "count": 2,
            "items": [
                {"name": "PSA (Total)", "description": "Prostate cancer screening marker"},
                {"name": "Free PSA", "description": "Helps differentiate benign from malignant conditions"}
            ]
        },
        {
            "category": "Hormonal Profile",
            "count": 4,
            "items": [
                {"name": "Testosterone (Total)", "description": "Primary male hormone"},
                {"name": "Free Testosterone", "description": "Active testosterone"},
                {"name": "DHEA-S", "description": "Adrenal hormone"},
                {"name": "SHBG", "description": "Sex hormone binding globulin"}
            ]
        },
        {
            "category": "Cardiac Risk Markers",
            "count": 6,
            "items": [
                {"name": "Total Cholesterol", "description": "Total cholesterol"},
                {"name": "LDL Cholesterol", "description": "Bad cholesterol"},
                {"name": "HDL Cholesterol", "description": "Good cholesterol"},
                {"name": "Triglycerides", "description": "Blood fats"},
                {"name": "Apolipoprotein B", "description": "Atherogenic particle"},
                {"name": "hs-CRP", "description": "Cardiac inflammation marker"}
            ]
        },
        {
            "category": "Diabetes Screening",
            "count": 3,
            "items": [
                {"name": "Fasting Glucose", "description": "Blood sugar"},
                {"name": "HbA1c", "description": "Average blood sugar"},
                {"name": "Fasting Insulin", "description": "Insulin resistance"}
            ]
        },
        {
            "category": "Liver Function",
            "count": 8,
            "items": [
                {"name": "SGOT", "description": "Liver enzyme"},
                {"name": "SGPT", "description": "Liver enzyme - sensitive to alcohol"},
                {"name": "GGT", "description": "Alcohol consumption marker"},
                {"name": "Alkaline Phosphatase", "description": "Liver/bone enzyme"},
                {"name": "Total Bilirubin", "description": "Bile pigment"},
                {"name": "Direct Bilirubin", "description": "Conjugated bilirubin"},
                {"name": "Total Protein", "description": "Blood protein"},
                {"name": "Albumin", "description": "Liver protein"}
            ]
        },
        {
            "category": "Kidney Function",
            "count": 5,
            "items": [
                {"name": "Creatinine", "description": "Kidney function"},
                {"name": "Blood Urea", "description": "Kidney waste"},
                {"name": "eGFR", "description": "Filtration rate"},
                {"name": "Uric Acid", "description": "Gout marker"},
                {"name": "BUN/Creatinine Ratio", "description": "Kidney indicator"}
            ]
        },
        {
            "category": "Thyroid Function",
            "count": 3,
            "items": [
                {"name": "TSH", "description": "Thyroid hormone"},
                {"name": "Free T3", "description": "Active thyroid"},
                {"name": "Free T4", "description": "Thyroid hormone"}
            ]
        },
        {
            "category": "Complete Blood Count",
            "count": 8,
            "items": [
                {"name": "Hemoglobin", "description": "Oxygen carrying"},
                {"name": "RBC Count", "description": "Red blood cells"},
                {"name": "WBC Count", "description": "White blood cells"},
                {"name": "Platelet Count", "description": "Clotting cells"},
                {"name": "PCV", "description": "Packed cell volume"},
                {"name": "MCV", "description": "Cell size"},
                {"name": "MCH", "description": "Hemoglobin content"},
                {"name": "ESR", "description": "Inflammation marker"}
            ]
        },
        {
            "category": "Vitamins",
            "count": 2,
            "items": [
                {"name": "Vitamin D", "description": "Bone and immunity"},
                {"name": "Vitamin B12", "description": "Energy and nerves"}
            ]
        },
        {
            "category": "Urine Analysis",
            "count": 7,
            "items": [
                {"name": "Urine Routine", "description": "Complete examination"},
                {"name": "pH", "description": "Acidity"},
                {"name": "Protein", "description": "Kidney health"},
                {"name": "Glucose", "description": "Diabetes"},
                {"name": "Blood", "description": "Prostate/kidney indicator"},
                {"name": "Pus Cells", "description": "Infection"},
                {"name": "RBCs", "description": "Urinary tract health"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "At what age should men start PSA screening?", "answer": "PSA screening is generally recommended starting at age 50, or at 40-45 for those with family history of prostate cancer or African descent. Discuss with your doctor for personalized advice."},
        {"question": "What do low testosterone levels mean?", "answer": "Low testosterone can cause fatigue, reduced muscle mass, low libido, mood changes, and increased body fat. It can be due to aging, obesity, or underlying conditions. Treatment options are available."},
        {"question": "Why is GGT included in this package?", "answer": "GGT is a sensitive marker for liver health, particularly alcohol-related liver issues. It''s an important test for men who consume alcohol regularly."},
        {"question": "How can I improve my test results?", "answer": "Regular exercise, maintaining healthy weight, limiting alcohol, not smoking, eating a balanced diet, and managing stress can significantly improve most health markers."}
    ]'::jsonb
);

-- Package 9: Senior Citizen Health Package
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'senior-citizen',
    'Senior Citizen Health Package',
    'published',
    false,
    9,
    5499.00,
    3999.00,
    27.00,
    48,
    65,
    '10-12 hours fasting required',
    25,
    'Comprehensive health screening for adults above 60 years. Includes cardiac markers, diabetes panel, bone health, kidney function, and age-related health markers.',
    'The Senior Citizen Health Package is specifically designed for individuals above 60 years of age. As we age, the risk of various health conditions increases, making regular comprehensive screening essential for early detection and management.

This package covers all major areas of concern for seniors including cardiovascular health, diabetes, kidney function, bone health (osteoporosis screening), thyroid function, nutritional deficiencies, and age-related markers. Regular screening helps in maintaining quality of life and independence in the golden years by detecting and managing conditions early.',
    '[
        {
            "category": "Cardiac Profile",
            "count": 10,
            "items": [
                {"name": "Total Cholesterol", "description": "Total cholesterol"},
                {"name": "LDL Cholesterol", "description": "Bad cholesterol"},
                {"name": "HDL Cholesterol", "description": "Good cholesterol"},
                {"name": "Triglycerides", "description": "Blood fats"},
                {"name": "VLDL", "description": "Very low density lipoprotein"},
                {"name": "LDL/HDL Ratio", "description": "Risk ratio"},
                {"name": "hs-CRP", "description": "Cardiac inflammation"},
                {"name": "Homocysteine", "description": "Heart disease marker"},
                {"name": "Lipoprotein(a)", "description": "Genetic risk marker"},
                {"name": "Pro-BNP", "description": "Heart failure marker"}
            ]
        },
        {
            "category": "Diabetes Panel",
            "count": 4,
            "items": [
                {"name": "Fasting Glucose", "description": "Blood sugar"},
                {"name": "Post Prandial Glucose", "description": "After meal sugar"},
                {"name": "HbA1c", "description": "3-month average"},
                {"name": "Fasting Insulin", "description": "Insulin level"}
            ]
        },
        {
            "category": "Kidney Function",
            "count": 7,
            "items": [
                {"name": "Creatinine", "description": "Kidney function"},
                {"name": "Blood Urea", "description": "Kidney waste"},
                {"name": "eGFR", "description": "Filtration rate - critical for seniors"},
                {"name": "Uric Acid", "description": "Gout marker"},
                {"name": "Microalbumin", "description": "Early kidney damage"},
                {"name": "Electrolytes (Na, K)", "description": "Balance important for seniors"},
                {"name": "Cystatin C", "description": "More accurate kidney marker for seniors"}
            ]
        },
        {
            "category": "Bone Health",
            "count": 5,
            "items": [
                {"name": "Vitamin D", "description": "Critical for bone health"},
                {"name": "Calcium", "description": "Bone mineral"},
                {"name": "Phosphorus", "description": "Bone strength"},
                {"name": "Alkaline Phosphatase", "description": "Bone turnover"},
                {"name": "PTH", "description": "Parathyroid hormone - calcium regulation"}
            ]
        },
        {
            "category": "Thyroid Function",
            "count": 3,
            "items": [
                {"name": "TSH", "description": "Thyroid function"},
                {"name": "Free T3", "description": "Active hormone"},
                {"name": "Free T4", "description": "Thyroid hormone"}
            ]
        },
        {
            "category": "Liver Function",
            "count": 8,
            "items": [
                {"name": "SGOT", "description": "Liver enzyme"},
                {"name": "SGPT", "description": "Liver enzyme"},
                {"name": "GGT", "description": "Liver/bile enzyme"},
                {"name": "Alkaline Phosphatase", "description": "Liver/bone"},
                {"name": "Total Bilirubin", "description": "Liver function"},
                {"name": "Total Protein", "description": "Nutritional status"},
                {"name": "Albumin", "description": "Liver protein"},
                {"name": "Globulin", "description": "Immune proteins"}
            ]
        },
        {
            "category": "Complete Blood Count",
            "count": 10,
            "items": [
                {"name": "Hemoglobin", "description": "Anemia common in seniors"},
                {"name": "RBC Count", "description": "Red cells"},
                {"name": "WBC Count", "description": "Immune cells"},
                {"name": "Platelet Count", "description": "Clotting"},
                {"name": "PCV", "description": "Packed cells"},
                {"name": "MCV", "description": "Cell size"},
                {"name": "MCH", "description": "Hemoglobin content"},
                {"name": "MCHC", "description": "Hemoglobin concentration"},
                {"name": "RDW", "description": "Cell variation"},
                {"name": "ESR", "description": "Inflammation"}
            ]
        },
        {
            "category": "Vitamins & Minerals",
            "count": 6,
            "items": [
                {"name": "Vitamin B12", "description": "Often deficient in seniors"},
                {"name": "Folate", "description": "For cell division"},
                {"name": "Iron", "description": "Anemia prevention"},
                {"name": "Ferritin", "description": "Iron stores"},
                {"name": "Magnesium", "description": "Heart and muscle health"},
                {"name": "Zinc", "description": "Immunity and wound healing"}
            ]
        },
        {
            "category": "Inflammatory Markers",
            "count": 3,
            "items": [
                {"name": "CRP", "description": "Inflammation"},
                {"name": "ESR", "description": "Chronic inflammation"},
                {"name": "RA Factor", "description": "Arthritis marker"}
            ]
        },
        {
            "category": "Urine Analysis",
            "count": 9,
            "items": [
                {"name": "Urine Routine", "description": "Complete examination"},
                {"name": "pH", "description": "Acidity"},
                {"name": "Specific Gravity", "description": "Concentration"},
                {"name": "Protein", "description": "Kidney health"},
                {"name": "Glucose", "description": "Diabetes"},
                {"name": "Blood", "description": "UTI/kidney"},
                {"name": "Pus Cells", "description": "Infection"},
                {"name": "Bacteria", "description": "UTI"},
                {"name": "Casts", "description": "Kidney disease marker"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "How often should seniors get health checkups?", "answer": "Seniors should have comprehensive health screening every 6 months. Those with existing conditions may need more frequent monitoring as advised by their doctor."},
        {"question": "Why is kidney function so important in seniors?", "answer": "Kidney function naturally declines with age. Monitoring is crucial for proper medication dosing (many drugs are cleared by kidneys) and early detection of kidney disease."},
        {"question": "What precautions are needed for sample collection?", "answer": "Our phlebotomists are trained for senior care. They use gentle techniques and take extra care. Family members are welcome to be present during collection."},
        {"question": "Can medications affect test results?", "answer": "Yes, many medications can affect various test results. Please provide a complete list of your medications so our doctors can interpret results accurately."},
        {"question": "Is home collection recommended for seniors?", "answer": "Yes, home collection is highly recommended for seniors as it provides convenience, familiar environment, and avoids travel stress. Our team ensures safe and comfortable collection."}
    ]'::jsonb
);

-- Package 10: Executive Health Package
INSERT INTO public.packages (
    slug, title, status, is_featured, sort_order,
    mrp, price, discount_percent,
    reports_within_hours, tests_included, requisites, home_collection_minutes,
    highlights, description, parameters, faqs
) VALUES (
    'executive-health',
    'Executive Health Package',
    'published',
    true,
    10,
    7999.00,
    5999.00,
    25.00,
    48,
    92,
    '10-12 hours fasting required',
    25,
    'Premium comprehensive health assessment for executives. Includes advanced cardiac markers, cancer markers, stress hormones, and complete organ function tests.',
    'The Executive Health Package is our most comprehensive health screening option, designed for busy professionals who need thorough health assessment with minimal time investment. This premium package covers all aspects of health with advanced testing that goes beyond routine screening.

This package includes advanced cardiac risk assessment, tumor markers for early cancer detection, stress hormones (cortisol), complete vitamin and mineral panel, advanced thyroid profile, and comprehensive organ function tests. It is ideal for executives, business owners, and professionals with high-stress lifestyles who need to ensure their health keeps pace with their demands. The package includes a complimentary doctor consultation to discuss results and health recommendations.',
    '[
        {
            "category": "Advanced Cardiac Assessment",
            "count": 12,
            "items": [
                {"name": "Total Cholesterol", "description": "Blood cholesterol"},
                {"name": "LDL Cholesterol (Direct)", "description": "Direct measurement"},
                {"name": "HDL Cholesterol", "description": "Protective cholesterol"},
                {"name": "Triglycerides", "description": "Blood fats"},
                {"name": "VLDL", "description": "Very low density lipoprotein"},
                {"name": "Apolipoprotein A1", "description": "HDL protein"},
                {"name": "Apolipoprotein B", "description": "LDL protein"},
                {"name": "Lipoprotein(a)", "description": "Genetic risk marker"},
                {"name": "hs-CRP", "description": "Cardiac inflammation"},
                {"name": "Homocysteine", "description": "Heart disease risk"},
                {"name": "Pro-BNP", "description": "Heart failure marker"},
                {"name": "Lp-PLA2", "description": "Vascular inflammation"}
            ]
        },
        {
            "category": "Cancer Markers",
            "count": 6,
            "items": [
                {"name": "CEA", "description": "Carcinoembryonic antigen - GI cancers"},
                {"name": "AFP", "description": "Alpha-fetoprotein - Liver cancer"},
                {"name": "CA 19-9", "description": "Pancreatic cancer marker"},
                {"name": "PSA (Men) / CA 125 (Women)", "description": "Gender-specific cancer markers"},
                {"name": "CA 15-3 (Women)", "description": "Breast cancer marker"},
                {"name": "Beta-2 Microglobulin", "description": "Blood cancer marker"}
            ]
        },
        {
            "category": "Diabetes & Metabolic",
            "count": 6,
            "items": [
                {"name": "Fasting Glucose", "description": "Blood sugar"},
                {"name": "HbA1c", "description": "3-month average"},
                {"name": "Fasting Insulin", "description": "Insulin level"},
                {"name": "HOMA-IR", "description": "Insulin resistance"},
                {"name": "C-Peptide", "description": "Insulin production"},
                {"name": "Adiponectin", "description": "Metabolic health marker"}
            ]
        },
        {
            "category": "Stress Hormones",
            "count": 4,
            "items": [
                {"name": "Cortisol (Morning)", "description": "Stress hormone"},
                {"name": "DHEA-S", "description": "Adrenal function"},
                {"name": "Testosterone", "description": "Energy and vitality"},
                {"name": "Prolactin", "description": "Stress-related hormone"}
            ]
        },
        {
            "category": "Thyroid Complete",
            "count": 6,
            "items": [
                {"name": "TSH", "description": "Thyroid function"},
                {"name": "Free T3", "description": "Active hormone"},
                {"name": "Free T4", "description": "Thyroid hormone"},
                {"name": "Total T3", "description": "Total T3"},
                {"name": "Anti-TPO", "description": "Thyroid antibodies"},
                {"name": "Anti-TG", "description": "Thyroglobulin antibodies"}
            ]
        },
        {
            "category": "Liver Function Complete",
            "count": 10,
            "items": [
                {"name": "SGOT", "description": "Liver enzyme"},
                {"name": "SGPT", "description": "Liver enzyme"},
                {"name": "GGT", "description": "Alcohol/liver marker"},
                {"name": "Alkaline Phosphatase", "description": "Liver/bone"},
                {"name": "Total Bilirubin", "description": "Bile pigment"},
                {"name": "Direct Bilirubin", "description": "Conjugated"},
                {"name": "Total Protein", "description": "Protein status"},
                {"name": "Albumin", "description": "Liver protein"},
                {"name": "Globulin", "description": "Immune proteins"},
                {"name": "LDH", "description": "Cell damage marker"}
            ]
        },
        {
            "category": "Kidney Function Complete",
            "count": 8,
            "items": [
                {"name": "Creatinine", "description": "Kidney function"},
                {"name": "Blood Urea", "description": "Waste product"},
                {"name": "eGFR", "description": "Filtration rate"},
                {"name": "Uric Acid", "description": "Gout marker"},
                {"name": "Cystatin C", "description": "Accurate kidney marker"},
                {"name": "Microalbumin", "description": "Early damage"},
                {"name": "Urine ACR", "description": "Albumin-creatinine ratio"},
                {"name": "BUN/Creatinine Ratio", "description": "Kidney indicator"}
            ]
        },
        {
            "category": "Complete Blood Count",
            "count": 12,
            "items": [
                {"name": "Hemoglobin", "description": "Oxygen carrying"},
                {"name": "RBC Count", "description": "Red cells"},
                {"name": "WBC Count", "description": "White cells"},
                {"name": "Platelet Count", "description": "Clotting"},
                {"name": "PCV", "description": "Packed cells"},
                {"name": "MCV", "description": "Cell size"},
                {"name": "MCH", "description": "Hemoglobin/cell"},
                {"name": "MCHC", "description": "Concentration"},
                {"name": "RDW", "description": "Variation"},
                {"name": "Differential Count", "description": "WBC types"},
                {"name": "ESR", "description": "Inflammation"},
                {"name": "Peripheral Smear", "description": "Cell examination"}
            ]
        },
        {
            "category": "Vitamins & Minerals Complete",
            "count": 10,
            "items": [
                {"name": "Vitamin D", "description": "Bone/immunity"},
                {"name": "Vitamin B12", "description": "Energy/nerves"},
                {"name": "Folate", "description": "Cell division"},
                {"name": "Vitamin B6", "description": "Metabolism"},
                {"name": "Iron", "description": "Energy"},
                {"name": "Ferritin", "description": "Iron stores"},
                {"name": "TIBC", "description": "Iron binding"},
                {"name": "Calcium", "description": "Bones"},
                {"name": "Magnesium", "description": "Muscles/nerves"},
                {"name": "Zinc", "description": "Immunity"}
            ]
        },
        {
            "category": "Electrolytes",
            "count": 5,
            "items": [
                {"name": "Sodium", "description": "Fluid balance"},
                {"name": "Potassium", "description": "Heart/muscle"},
                {"name": "Chloride", "description": "Balance"},
                {"name": "Bicarbonate", "description": "Acid-base"},
                {"name": "Phosphorus", "description": "Energy/bones"}
            ]
        },
        {
            "category": "Inflammatory Markers",
            "count": 4,
            "items": [
                {"name": "CRP", "description": "General inflammation"},
                {"name": "hs-CRP", "description": "Cardiac specific"},
                {"name": "ESR", "description": "Chronic inflammation"},
                {"name": "Ferritin", "description": "Acute phase reactant"}
            ]
        },
        {
            "category": "Urine Complete",
            "count": 9,
            "items": [
                {"name": "Urine Routine", "description": "Physical/chemical"},
                {"name": "pH", "description": "Acidity"},
                {"name": "Specific Gravity", "description": "Concentration"},
                {"name": "Protein", "description": "Kidney health"},
                {"name": "Glucose", "description": "Diabetes"},
                {"name": "Ketones", "description": "Metabolism"},
                {"name": "Blood", "description": "Bleeding"},
                {"name": "Microscopy", "description": "Cells/casts"},
                {"name": "Microalbumin", "description": "Early kidney damage"}
            ]
        }
    ]'::jsonb,
    '[
        {"question": "What makes this package suitable for executives?", "answer": "This package is designed for comprehensive assessment in a single visit, includes advanced markers often missed in basic tests, stress hormone analysis relevant to high-pressure jobs, and complimentary doctor consultation."},
        {"question": "Are cancer markers reliable for screening?", "answer": "Tumor markers are useful as part of comprehensive screening but not definitive for diagnosis. Elevated levels require further investigation. They''re most useful for monitoring known conditions and risk assessment."},
        {"question": "How long will the sample collection take?", "answer": "Sample collection typically takes 20-25 minutes. We can arrange early morning collection to minimize disruption to your schedule."},
        {"question": "Is doctor consultation included?", "answer": "Yes, this package includes a complimentary 30-minute telephonic or video consultation with our senior physician to discuss your results and provide personalized health recommendations."},
        {"question": "Can this be done at my office?", "answer": "Yes, we offer corporate collection services. Our phlebotomist can visit your office for sample collection. Contact us for corporate health screening programs."},
        {"question": "How often should executives get this checkup?", "answer": "We recommend annual comprehensive screening for executives. Those with high-stress lifestyles or existing health concerns may benefit from bi-annual testing."}
    ]'::jsonb
);

-- ============================================================================
-- SECTION 5: TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE public.packages IS 'Health screening packages for public website display and booking';
COMMENT ON COLUMN public.packages.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN public.packages.status IS 'published, draft, or archived';
COMMENT ON COLUMN public.packages.parameters IS 'JSON array of parameter categories with items';
COMMENT ON COLUMN public.packages.faqs IS 'JSON array of frequently asked questions';

COMMIT;
