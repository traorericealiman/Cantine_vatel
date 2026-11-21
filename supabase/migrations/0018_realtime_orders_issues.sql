-- L'admin voit les commandes et signalements en direct (les règles d'accès par ligne s'appliquent aussi au temps réel).
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.issues;
