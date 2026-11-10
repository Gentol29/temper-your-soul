-- Schema di riferimento: confrontare con profiles esistente prima di applicarlo.
-- Il server non esegue questo DDL automaticamente. Il tipo di id segue il provider.
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  character jsonb NOT NULL,
  gold bigint NOT NULL DEFAULT 0 CHECK (gold >= 0),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
-- Con Supabase usare un ruolo server dedicato: nessuna scrittura diretta dal browser.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
