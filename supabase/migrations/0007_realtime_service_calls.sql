-- Les appels de plats et les tables sont diffusés en direct aux élèves.
-- (La table settings n'est volontairement pas diffusée : elle contient le jeton du QR code.)
alter publication supabase_realtime add table public.service_calls;
