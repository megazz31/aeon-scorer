-- Aeon v3.2: the client only needs CRUD on saved decks.
-- RLS still restricts every row operation to auth.uid() = user_id.
revoke all on table public.decks from anon, authenticated;
grant select, insert, update, delete on table public.decks to authenticated;
