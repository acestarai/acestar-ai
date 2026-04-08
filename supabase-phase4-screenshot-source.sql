alter table if exists meetings
  drop constraint if exists meetings_source_type_check;

alter table if exists meetings
  add constraint meetings_source_type_check
  check (source_type in ('upload', 'teams', 'manual', 'screenshot'));
