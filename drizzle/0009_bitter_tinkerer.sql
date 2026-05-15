ALTER TABLE "exercises"
ALTER COLUMN "category" SET DATA TYPE text
USING array_to_string("category", ', ');

UPDATE "exercises"
SET "category" = array_to_string(
  ARRAY(
    SELECT cleaned_category
    FROM (
      SELECT regexp_replace(
        regexp_replace(trim(category_item), '^[{\["\s,]+', ''),
        '[}\]"\s,]+$',
        ''
      ) AS cleaned_category
      FROM unnest(regexp_split_to_array("category", '\s*,\s*')) AS category_item
    ) AS normalized_categories
    WHERE cleaned_category <> ''
  ),
  ', '
);

UPDATE "workout_exercise_entries"
SET "exercise_category_snapshot" = array_to_string(
  ARRAY(
    SELECT cleaned_category
    FROM (
      SELECT regexp_replace(
        regexp_replace(trim(category_item), '^[{\["\s,]+', ''),
        '[}\]"\s,]+$',
        ''
      ) AS cleaned_category
      FROM unnest(
        regexp_split_to_array("exercise_category_snapshot", '\s*,\s*')
      ) AS category_item
    ) AS normalized_categories
    WHERE cleaned_category <> ''
  ),
  ', '
);
