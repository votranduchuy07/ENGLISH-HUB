-- ============================================================================
-- ENGLISH HUB — Supabase / PostgreSQL schema (v2 backend)
-- Chạy trong Supabase SQL editor. Mọi bảng dữ liệu cá nhân đều bật RLS.
-- ============================================================================

create type cefr_level as enum ('A1','A2','B1','B2','C1','C2');
create type verification_status as enum ('verified','suggested','user');
create type srs_status as enum ('new','learning','review','mastered');
create type mistake_category as enum ('spelling','meaning','word_class','pronunciation','synonym','context');

-- Hồ sơ người dùng (1-1 với auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Học viên',
  current_level cefr_level not null default 'A2',
  created_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  accent text not null default 'uk' check (accent in ('uk','us')),
  speech_rate real not null default 0.9 check (speech_rate between 0.5 and 1.5),
  interests text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.daily_goals (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  effective_from date not null default current_date,
  new_words int not null default 15 check (new_words between 0 and 100),
  flashcards int not null default 20 check (flashcards between 0 and 500),
  quizzes int not null default 1 check (quizzes between 0 and 20),
  minutes int not null default 20 check (minutes between 0 and 600),
  unique (user_id, effective_from)
);

-- Kho từ vựng: owner_id NULL = kho hệ thống (chỉ đọc), có giá trị = từ của riêng người dùng
create table public.vocabulary_categories (
  id text primary key,                 -- ví dụ 'travel'
  name_vi text not null,
  name_en text not null
);

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete cascade,
  word text not null,
  ipa_uk text, ipa_us text,
  audio_uk text, audio_us text,
  parts_of_speech text[] not null,
  meaning_vi text not null,
  definition_en text,
  examples jsonb not null default '[]',          -- [{en, vi}]
  synonyms text[] not null default '{}',
  antonyms text[] not null default '{}',
  collocations text[] not null default '{}',
  phrasal_verbs text[] not null default '{}',
  word_family text[] not null default '{}',
  cefr cefr_level,
  cefr_status verification_status not null default 'suggested',
  cefr_reference text,                            -- 'Oxford 5000', 'EVP'...
  content_source text not null default 'curated', -- curated | dictionaryapi | import | user
  license_note text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (owner_id, word)
);
create index on public.vocabulary (cefr);
create index on public.vocabulary using gin (to_tsvector('simple', word || ' ' || meaning_vi));

create table public.vocabulary_category_links (
  vocabulary_id uuid references public.vocabulary(id) on delete cascade,
  category_id text references public.vocabulary_categories(id) on delete cascade,
  primary key (vocabulary_id, category_id)
);

-- Trạng thái học từng từ của từng người (SRS)
create table public.user_vocabulary (
  user_id uuid references public.users(id) on delete cascade,
  vocabulary_id uuid references public.vocabulary(id) on delete cascade,
  status srs_status not null default 'new',
  favorite boolean not null default false,
  in_review_list boolean not null default false,
  ease real not null default 2.5,
  interval_days real not null default 0,
  repetitions int not null default 0,
  lapses int not null default 0,
  times_correct int not null default 0,
  times_wrong int not null default 0,
  first_learned_at timestamptz,
  last_reviewed_at timestamptz,
  due_at timestamptz,
  primary key (user_id, vocabulary_id)
);
create index on public.user_vocabulary (user_id, due_at);

create table public.flashcard_reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  rating text not null check (rating in ('again','hard','good','easy')),
  mode text not null,
  interval_after real not null,
  reviewed_at timestamptz not null default now()
);

create table public.spelling_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  mode text not null check (mode in ('vi_to_en','def_to_en','audio','missing','correction')),
  answer text not null,
  is_correct boolean not null,
  duration_ms int not null,
  attempted_at timestamptz not null default now()
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  quiz_type text not null,
  config jsonb not null,               -- {levels, topics, count, timeLimit, difficulty}
  created_at timestamptz not null default now()
);

create table public.quiz_results (
  id bigint generated always as identity primary key,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  total int not null, correct int not null, duration_ms int not null,
  items jsonb not null,                -- [{vocabulary_id, correct}]
  finished_at timestamptz not null default now()
);

create table public.mistakes (
  user_id uuid references public.users(id) on delete cascade,
  vocabulary_id uuid references public.vocabulary(id) on delete cascade,
  category mistake_category not null,
  source_module text not null,
  wrong_answers text[] not null default '{}',
  count int not null default 1,
  last_wrong_at timestamptz not null default now(),
  resolved_at timestamptz,
  history jsonb not null default '[]', -- [{at, correct}]
  primary key (user_id, vocabulary_id, category)
);

create table public.learning_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  module text not null,
  started_at timestamptz not null,
  duration_ms int not null check (duration_ms >= 0),
  items int not null default 0
);
create index on public.learning_sessions (user_id, started_at);

-- ============================== ROW LEVEL SECURITY ==============================
alter table public.users enable row level security;
alter table public.user_settings enable row level security;
alter table public.daily_goals enable row level security;
alter table public.vocabulary enable row level security;
alter table public.vocabulary_categories enable row level security;
alter table public.vocabulary_category_links enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.spelling_attempts enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_results enable row level security;
alter table public.mistakes enable row level security;
alter table public.learning_sessions enable row level security;

create policy "own profile" on public.users for all using (id = auth.uid()) with check (id = auth.uid());

-- Kho hệ thống: ai đăng nhập cũng đọc được; từ riêng chỉ chủ sở hữu thấy và sửa
create policy "read vocabulary" on public.vocabulary for select using (owner_id is null or owner_id = auth.uid());
create policy "write own vocabulary" on public.vocabulary for insert with check (owner_id = auth.uid());
create policy "update own vocabulary" on public.vocabulary for update using (owner_id = auth.uid());
create policy "delete own vocabulary" on public.vocabulary for delete using (owner_id = auth.uid());
create policy "read categories" on public.vocabulary_categories for select using (true);
create policy "read category links" on public.vocabulary_category_links for select using (true);

-- Bảng có cột user_id: chỉ chủ sở hữu
do $$
declare t text;
begin
  foreach t in array array['user_settings','daily_goals','user_vocabulary','flashcard_reviews','spelling_attempts','quizzes','quiz_results','mistakes','learning_sessions']
  loop
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
