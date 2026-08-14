
ALTER TABLE public.heirway_learning_modules ADD COLUMN allowed_plans text[] NOT NULL DEFAULT '{free,education,foundation,business,wealth_builder}';
ALTER TABLE public.heirway_learning_content ADD COLUMN allowed_plans text[] NOT NULL DEFAULT '{free,education,foundation,business,wealth_builder}';
