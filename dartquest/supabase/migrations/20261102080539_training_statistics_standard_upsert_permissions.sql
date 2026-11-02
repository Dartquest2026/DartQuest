grant update on public.training_sessions to authenticated;
create policy "training sessions update own" on public.training_sessions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
