create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid,
  full_name text,
  phone text,
  city text,
  role text,
  skills text[],
  consent boolean default false,
  years_experience int,
  created_at timestamptz default now()
);

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  file_path text,
  parsed jsonb,
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  employer_profile_id uuid references profiles(id) on delete cascade,
  title text,
  description text,
  city text,
  skills text[],
  created_at timestamptz default now()
);

alter table profiles add constraint profiles_auth_uid_unique unique (auth_uid);