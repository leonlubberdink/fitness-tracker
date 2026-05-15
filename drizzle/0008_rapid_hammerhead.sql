ALTER TABLE "exercises"
ALTER COLUMN "category" SET DATA TYPE text[]
USING array_remove(regexp_split_to_array(btrim("category"), '\s*,\s*'), '');
