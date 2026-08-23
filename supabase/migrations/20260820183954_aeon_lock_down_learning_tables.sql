-- 20260820183954_aeon_lock_down_learning_tables.sql

-- Enable RLS
alter table public.user_preferences enable row level security;
alter table public.decks enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_markers enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_events enable row level security;
alter table public.player_elo enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.analysis_audit_queue enable row level security;
alter table public.audit_findings enable row level security;
alter table public.audit_runs enable row level security;
alter table public.card_semantics enable row level security;

-- Policies for user_preferences
create policy "Users can view their own preferences" on public.user_preferences
  for select using (auth.uid() = user_id);
create policy "Users can insert their own preferences" on public.user_preferences
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own preferences" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Group members can view usernames of fellow members" on public.user_preferences
  for select using (
    user_id = auth.uid() or exists (
      select 1 from public.group_members g1
      join public.group_members g2 on g1.group_id = g2.group_id
      where g1.user_id = auth.uid() and g2.user_id = user_preferences.user_id
    )
  );

-- Policies for decks
create policy "Users can view their own decks" on public.decks
  for select using (auth.uid() = user_id);
create policy "Users can insert their own decks" on public.decks
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own decks" on public.decks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own decks" on public.decks
  for delete using (auth.uid() = user_id);

-- Policies for groups
create policy "Members can view their groups" on public.groups
  for select using (created_by = auth.uid() or exists (
    select 1 from public.group_members where group_members.group_id = groups.id and group_members.user_id = auth.uid()
  ));
create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.uid() = created_by);
create policy "Admin can update group" on public.groups
  for update using (exists (
    select 1 from public.group_members where group_members.group_id = groups.id and group_members.user_id = auth.uid() and group_members.role = 'admin'
  ));
create policy "Admin can delete group" on public.groups
  for delete using (created_by = auth.uid());

-- Policies for group_members
create policy "Members can view group members" on public.group_members
  for select using (public.is_group_member(group_id, auth.uid()));
create policy "Users can join groups" on public.group_members
  for insert with check (user_id = auth.uid());
create policy "Users can leave or admin can remove" on public.group_members
  for delete using (user_id = auth.uid() or exists (
    select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
  ));

-- Policies for group_markers
create policy "Members can view group markers" on public.group_markers
  for select using (public.is_group_member(group_id, auth.uid()));
create policy "Admin can manage group markers" on public.group_markers
  for all using (exists (
    select 1 from public.group_members where group_members.group_id = group_markers.group_id and group_members.user_id = auth.uid() and group_members.role = 'admin'
  )) with check (exists (
    select 1 from public.group_members where group_members.group_id = group_markers.group_id and group_members.user_id = auth.uid() and group_members.role = 'admin'
  ));

-- Policies for game_sessions & events
create policy "Users can view their own game sessions" on public.game_sessions
  for select using (auth.uid() = user_id);
create policy "Group members can view group game sessions" on public.game_sessions
  for select using (group_id is not null and exists (
    select 1 from public.group_members gm where gm.group_id = game_sessions.group_id and gm.user_id = auth.uid()
  ));
create policy "Users can insert their own game sessions" on public.game_sessions
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own game sessions" on public.game_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own game sessions" on public.game_sessions
  for delete using (auth.uid() = user_id);

create policy "Users can view events of their sessions" on public.game_events
  for select using (exists (
    select 1 from public.game_sessions where game_sessions.id = game_events.session_id and game_sessions.user_id = auth.uid()
  ));
create policy "Users can insert events for their sessions" on public.game_events
  for insert with check (exists (
    select 1 from public.game_sessions where game_sessions.id = game_events.session_id and game_sessions.user_id = auth.uid()
  ));
create policy "Users can delete events of their sessions" on public.game_events
  for delete using (exists (
    select 1 from public.game_sessions where game_sessions.id = game_events.session_id and game_sessions.user_id = auth.uid()
  ));

-- Policies for player_elo
create policy "Users can view all elo" on public.player_elo
  for select using (true);
create policy "Users can insert own elo" on public.player_elo
  for insert with check (user_id = auth.uid());
create policy "Users can update own elo" on public.player_elo
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Policies for analysis_runs
create policy "Users can view their own analysis history" on public.analysis_runs
  for select using (auth.uid() = user_id);
