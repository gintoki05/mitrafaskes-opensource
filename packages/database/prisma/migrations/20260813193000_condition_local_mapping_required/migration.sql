-- Condition remains local-first: a diagnosis may keep its local code while
-- terminology mapping is pending or unavailable. MasterIcd10 remains a
-- terminology lookup, not a persistence prerequisite for local clinical data.
ALTER TABLE "Diagnosis"
  DROP CONSTRAINT IF EXISTS "Diagnosis_icd10Code_fkey";
