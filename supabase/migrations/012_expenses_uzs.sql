-- Convert expenses to Uzbekistani sum (UZS).
-- UZS has no commonly used subunit, so we store the whole-sum amount directly.
-- Existing rows previously stored GBP pence; we divide by 100 to migrate them to whole pounds-as-sum
-- (no FX conversion is performed — historical values are scaled but not currency-converted).

ALTER TABLE public.expenses
  RENAME COLUMN amount_pence TO amount;

ALTER TABLE public.expenses
  ALTER COLUMN amount TYPE BIGINT USING (amount / 100);

ALTER TABLE public.expenses
  ALTER COLUMN currency SET DEFAULT 'UZS';

UPDATE public.expenses
  SET currency = 'UZS'
  WHERE currency = 'GBP';
