-- The transfers.to_branch check constraint predates the "branch users can
-- request transfers to main" feature and never allowed 'main' as a
-- destination (only restaurant1/restaurant2/shop). Every transfer request
-- from a branch to main -- which is now the only direction branch users are
-- allowed to request -- failed at the database level with:
--   new row for relation "transfers" violates check constraint
--   "transfers_to_branch_check"
-- Widen it to match transfers_from_branch_check and every other
-- branch-column constraint in the schema (stock, damaged_requests,
-- product_batches), which already correctly include 'main'.
alter table public.transfers drop constraint if exists transfers_to_branch_check;
alter table public.transfers add constraint transfers_to_branch_check
  check (to_branch in ('main', 'restaurant1', 'restaurant2', 'shop'));
