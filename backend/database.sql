create extension if not exists vector;

create table if not exists registered_users (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    created_at timestamp with time zone default now()
);

create table if not exists face_vectors (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references registered_users(id) on delete cascade,
    pose text not null,
    descriptor vector(128) not null,
    created_at timestamp with time zone default now()
);

create index if not exists face_vectors_user_id_idx
on face_vectors(user_id);

create index if not exists face_vectors_descriptor_idx
on face_vectors
using ivfflat (descriptor vector_cosine_ops)
with (lists = 100);

create or replace function match_face(
    query_embedding vector(128),
    match_threshold float default 0.65,
    match_count int default 5
)
returns table (
    user_id uuid,
    full_name text,
    pose text,
    similarity float
)
language sql
stable
as $$
    select
        u.id as user_id,
        u.full_name,
        fv.pose,
        1 - (fv.descriptor <=> query_embedding) as similarity
    from face_vectors fv
    join registered_users u on u.id = fv.user_id
    where 1 - (fv.descriptor <=> query_embedding) >= match_threshold
    order by fv.descriptor <=> query_embedding
    limit match_count;
$$;