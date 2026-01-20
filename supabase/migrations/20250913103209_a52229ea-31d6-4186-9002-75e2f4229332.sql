-- Create medical tests table
CREATE TABLE public.medical_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_code TEXT UNIQUE,
  description TEXT,
  body_system TEXT NOT NULL,
  customer_price DECIMAL(10,2) NOT NULL,
  report_delivered_in INTEGER NOT NULL DEFAULT 24, -- hours
  sample_type TEXT,
  synonyms TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create health profiles table
CREATE TABLE public.health_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_name TEXT NOT NULL,
  description TEXT,
  customer_price DECIMAL(10,2) NOT NULL,
  included_tests UUID[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_age INTEGER,
  customer_gender TEXT,
  address TEXT,
  preferred_date DATE,
  preferred_time TIME,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking items table
CREATE TABLE public.booking_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('test', 'profile')),
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.medical_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (no auth required)
CREATE POLICY "Medical tests are viewable by everyone" 
ON public.medical_tests 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Health profiles are viewable by everyone" 
ON public.health_profiles 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Anyone can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can create booking items" 
ON public.booking_items 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_medical_tests_body_system ON public.medical_tests(body_system);
CREATE INDEX idx_medical_tests_active ON public.medical_tests(is_active);
CREATE INDEX idx_health_profiles_popular ON public.health_profiles(is_popular);
CREATE INDEX idx_health_profiles_active ON public.health_profiles(is_active);
CREATE INDEX idx_booking_items_booking_id ON public.booking_items(booking_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_medical_tests_updated_at
  BEFORE UPDATE ON public.medical_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_health_profiles_updated_at
  BEFORE UPDATE ON public.health_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for medical tests by body system
INSERT INTO public.medical_tests (test_name, test_code, body_system, customer_price, description, sample_type) VALUES
-- Cardiovascular System
('Complete Lipid Profile', 'LIP001', 'Cardiovascular', 1200.00, 'Complete cholesterol and lipid analysis', 'Blood'),
('Troponin I', 'TRP001', 'Cardiovascular', 800.00, 'Cardiac marker for heart attack diagnosis', 'Blood'),
('ECG', 'ECG001', 'Cardiovascular', 500.00, 'Electrocardiogram for heart rhythm analysis', 'None'),
('D-Dimer', 'DDI001', 'Cardiovascular', 900.00, 'Blood clot detection marker', 'Blood'),
('BNP', 'BNP001', 'Cardiovascular', 1500.00, 'Brain natriuretic peptide for heart failure', 'Blood'),

-- Endocrine System
('HbA1c', 'HBA001', 'Endocrine', 600.00, 'Glycated hemoglobin for diabetes monitoring', 'Blood'),
('Thyroid Profile', 'THY001', 'Endocrine', 1000.00, 'Complete thyroid function test', 'Blood'),
('Insulin Fasting', 'INS001', 'Endocrine', 700.00, 'Fasting insulin levels', 'Blood'),
('Cortisol', 'COR001', 'Endocrine', 800.00, 'Stress hormone level', 'Blood'),
('Vitamin D', 'VTD001', 'Endocrine', 900.00, '25-hydroxy vitamin D levels', 'Blood'),

-- Hepatic System
('Liver Function Test', 'LFT001', 'Hepatic', 800.00, 'Complete liver function panel', 'Blood'),
('Hepatitis B Surface Antigen', 'HBS001', 'Hepatic', 600.00, 'Hepatitis B screening', 'Blood'),
('Hepatitis C Antibody', 'HCV001', 'Hepatic', 700.00, 'Hepatitis C screening', 'Blood'),
('Bilirubin Total', 'BIL001', 'Hepatic', 400.00, 'Total bilirubin levels', 'Blood'),
('Albumin', 'ALB001', 'Hepatic', 350.00, 'Serum albumin levels', 'Blood'),

-- Renal System
('Kidney Function Test', 'KFT001', 'Renal', 700.00, 'Complete kidney function panel', 'Blood'),
('Urine Complete', 'URN001', 'Renal', 300.00, 'Complete urine analysis', 'Urine'),
('Creatinine', 'CRE001', 'Renal', 400.00, 'Serum creatinine levels', 'Blood'),
('BUN', 'BUN001', 'Renal', 350.00, 'Blood urea nitrogen', 'Blood'),
('Microalbumin', 'MIC001', 'Renal', 600.00, 'Microalbumin in urine', 'Urine'),

-- Hematology
('Complete Blood Count', 'CBC001', 'Hematology', 500.00, 'Complete blood count with differential', 'Blood'),
('ESR', 'ESR001', 'Hematology', 200.00, 'Erythrocyte sedimentation rate', 'Blood'),
('Platelet Count', 'PLT001', 'Hematology', 300.00, 'Platelet count and function', 'Blood'),
('Iron Studies', 'IRN001', 'Hematology', 800.00, 'Complete iron profile', 'Blood'),
('B12 & Folate', 'B12001', 'Hematology', 900.00, 'Vitamin B12 and folate levels', 'Blood');

-- Insert sample health profiles
INSERT INTO public.health_profiles (profile_name, description, customer_price, category, is_popular) VALUES
('Basic Health Checkup', 'Essential tests for general health screening', 2500.00, 'Basic', true),
('Executive Health Package', 'Comprehensive health assessment for professionals', 8500.00, 'Premium', true),
('Cardiac Risk Assessment', 'Complete cardiovascular risk evaluation', 4200.00, 'Specialized', true),
('Diabetes Management Package', 'Complete diabetes monitoring and management', 3800.00, 'Specialized', true),
('Women Health Package', 'Specialized health screening for women', 5500.00, 'Gender-Specific', true),
('Senior Citizen Package', 'Comprehensive health checkup for elderly', 6800.00, 'Age-Specific', false);