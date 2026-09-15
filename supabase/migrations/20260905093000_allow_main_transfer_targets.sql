alter table public.transfers drop constraint if exists transfers_to_branch_check;
alter table public.transfers add constraint transfers_to_branch_check
  check (to_branch in ('main', 'restaurant1', 'restaurant2', 'shop'));
