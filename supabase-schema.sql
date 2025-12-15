-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: conversations
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('direct', 'group')),
  created_by uuid references auth.users(id),
  name text, -- For group chats
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Table: conversation_participants
create table conversation_participants (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique(conversation_id, user_id)
);

-- Table: messages
create table messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references auth.users(id),
  content text,
  file_url text,
  file_type text,
  edited boolean default false,
  deleted boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  read_at timestamp with time zone
);

-- RLS Policies

-- Enable RLS
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Conversations: Users can see conversations they are part of
create policy "Users can view conversations they are part of"
  on conversations for select
  using (
    exists (
      select 1 from conversation_participants
      where conversation_participants.conversation_id = conversations.id
      and conversation_participants.user_id = auth.uid()
    )
  );

create policy "Users can create conversations"
  on conversations for insert
  with check (auth.uid() = created_by);

-- Participants: Users can view participants of their conversations
create policy "Users can view participants of their conversations"
  on conversation_participants for select
  using (
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
      and cp.user_id = auth.uid()
    )
  );

create policy "Users can add participants"
  on conversation_participants for insert
  with check (true); -- Ideally restrict this to members of the chat

-- Messages: Users can view messages in their conversations
create policy "Users can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversation_participants
      where conversation_participants.conversation_id = messages.conversation_id
      and conversation_participants.user_id = auth.uid()
    )
  );

create policy "Users can insert messages"
  on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from conversation_participants
      where conversation_participants.conversation_id = messages.conversation_id
      and conversation_participants.user_id = auth.uid()
    )
  );

create policy "Users can update their own messages"
  on messages for update
  using (auth.uid() = sender_id);

-- Storage bucket for chat files
insert into storage.buckets (id, name) values ('chat_files', 'chat_files');

create policy "Authenticated users can upload chat files"
  on storage.objects for insert
  with check (bucket_id = 'chat_files' and auth.role() = 'authenticated');

create policy "Users can view chat files"
  on storage.objects for select
  using (bucket_id = 'chat_files' and auth.role() = 'authenticated');
