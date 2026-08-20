alter policy "Users can view their own decks" on public.decks using ((select auth.uid()) = user_id);
alter policy "Users can insert their own decks" on public.decks with check ((select auth.uid()) = user_id);
alter policy "Users can update their own decks" on public.decks using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can delete their own decks" on public.decks using ((select auth.uid()) = user_id);
alter policy "Users can view their own analysis history" on public.analysis_runs using ((select auth.uid()) = user_id);
drop index if exists public.idx_decks_user_modified;
