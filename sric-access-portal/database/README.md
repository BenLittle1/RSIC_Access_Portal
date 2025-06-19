# Database Documentation

This folder contains all database-related files for the SRIC Access Portal.

## Structure

```
database/
├── schemas/
│   └── supabase_setup.sql    # Complete database schema setup
└── migrations/
    └── add_requester_email.sql # Add requester_email column to guests table
```

## Setup Instructions

### Initial Setup
Run the schema file in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of schemas/supabase_setup.sql
```

### Migrations
Apply migrations in chronological order:
```sql
-- 1. Add requester email field
-- Copy and paste the contents of migrations/add_requester_email.sql
```

## Database Schema

### Tables

#### `profiles`
Stores user profile information linked to Supabase auth.users
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `full_name` (text)
- `username` (text, unique)
- `email` (text)
- `organization` (text)
- `authentication_status` (text, default: 'Pending')
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `guests`
Stores guest invitation records
- `id` (uuid, primary key)
- `name` (text)
- `visit_date` (date)
- `estimated_arrival` (time)
- `arrival_status` (boolean, default: false)
- `floor_access` (text)
- `inviter_id` (uuid, foreign key to auth.users)
- `organization` (text)
- `requester_email` (text)
- `created_at` (timestamp)

## Row Level Security (RLS)

Both tables have RLS enabled with policies for:
- Users can view/update their own profiles
- Security organization users can view all profiles
- Organization-based access control for guests table

## Organizations

- **Security**: Administrative access to all features
- **AXL**: Standard organization access
- **Knowledgehook**: Standard organization access  
- **Yscope**: Standard organization access 