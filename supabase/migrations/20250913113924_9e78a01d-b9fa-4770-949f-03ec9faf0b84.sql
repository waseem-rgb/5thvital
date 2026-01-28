-- Insert sample medical tests for the test catalog
INSERT INTO medical_tests (
  test_name,
  test_code,
  description,
  body_system,
  customer_price,
  sample_type,
  report_delivered_in
) VALUES
  -- Cardiovascular Tests
  ('Complete Lipid Profile', 'CLP001', 'Comprehensive cholesterol and triglyceride analysis', 'Cardiovascular', 1200, 'Blood', 24),
  ('Troponin I', 'TRP001', 'Cardiac marker for heart muscle damage', 'Cardiovascular', 800, 'Blood', 12),
  ('ECG', 'ECG001', 'Electrocardiogram for heart rhythm analysis', 'Cardiovascular', 500, 'Non-invasive', 2),
  ('D-Dimer', 'DDI001', 'Blood clot detection marker', 'Cardiovascular', 900, 'Blood', 24),
  ('BNP', 'BNP001', 'B-type natriuretic peptide for heart failure', 'Cardiovascular', 1500, 'Blood', 24),

  -- Endocrine Tests
  ('Thyroid Function Test', 'TFT001', 'Complete thyroid hormone panel (TSH, T3, T4)', 'Endocrine', 1000, 'Blood', 24),
  ('HbA1c', 'HBA001', 'Glycated hemoglobin for diabetes monitoring', 'Endocrine', 600, 'Blood', 24),
  ('Insulin Level', 'INS001', 'Fasting insulin measurement', 'Endocrine', 800, 'Blood', 24),
  ('Cortisol', 'COR001', 'Stress hormone level assessment', 'Endocrine', 700, 'Blood', 24),
  ('Vitamin D3', 'VTD001', '25-hydroxy vitamin D measurement', 'Endocrine', 900, 'Blood', 48),

  -- Hepatic Tests
  ('Liver Function Test', 'LFT001', 'Complete liver enzyme panel (SGOT, SGPT, Bilirubin)', 'Hepatic', 800, 'Blood', 24),
  ('Hepatitis B Surface Antigen', 'HBS001', 'Hepatitis B infection screening', 'Hepatic', 600, 'Blood', 24),
  ('Hepatitis C Antibody', 'HCV001', 'Hepatitis C infection screening', 'Hepatic', 700, 'Blood', 24),
  ('Alpha Fetoprotein', 'AFP001', 'Liver cancer screening marker', 'Hepatic', 1200, 'Blood', 48),
  ('Prothrombin Time', 'PTM001', 'Blood clotting function test', 'Hepatic', 400, 'Blood', 12),

  -- Renal Tests
  ('Kidney Function Test', 'KFT001', 'Comprehensive kidney function assessment', 'Renal', 700, 'Blood', 24),
  ('Urine Routine', 'URN001', 'Complete urine analysis', 'Renal', 300, 'Urine', 12),
  ('Creatinine', 'CRE001', 'Kidney function marker', 'Renal', 350, 'Blood', 12),
  ('BUN', 'BUN001', 'Blood urea nitrogen test', 'Renal', 400, 'Blood', 12),
  ('Microalbumin', 'MIC001', 'Early kidney damage detection', 'Renal', 800, 'Urine', 24),

  -- Hematology Tests
  ('Complete Blood Count', 'CBC001', 'Full blood cell analysis with differential', 'Hematology', 500, 'Blood', 12),
  ('ESR', 'ESR001', 'Erythrocyte sedimentation rate for inflammation', 'Hematology', 200, 'Blood', 12),
  ('Platelet Count', 'PLT001', 'Blood clotting cell count', 'Hematology', 300, 'Blood', 12),
  ('Hemoglobin Electrophoresis', 'HBE001', 'Thalassemia and sickle cell screening', 'Hematology', 1200, 'Blood', 48),
  ('Iron Studies', 'IRN001', 'Complete iron deficiency analysis', 'Hematology', 900, 'Blood', 24)
ON CONFLICT (test_code) DO NOTHING;
