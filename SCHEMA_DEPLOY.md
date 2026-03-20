# Schema Deployment Instructions

## Option 1: Run SQL via Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project: `oyeehgdufyttqxcstdel`
3. Click on "SQL Editor" in the left sidebar
4. Copy the contents of `scripts/supabase-schema.sql`
5. Paste into the SQL Editor
6. Click "Run" to execute

## Option 2: Run SQL via Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref oyeehgdufyttqxcstdel

# Run the migration
supabase db push
```

Or run the SQL file directly:
```bash
supabase db execute --project-ref oyeehgdufyttqxcstdel -f scripts/supabase-schema.sql
```

## Option 3: Use psql

```bash
# Get connection string from Supabase dashboard
# Settings > Database > Connection string

psql "postgresql://postgres:[YOUR-PASSWORD]@db.oyeehgdufyttqxcstdel.supabase.co:5432/postgres" -f scripts/supabase-schema.sql
```

## Tables Created

1. **users** - Extended user information
2. **profiles** - User profile data (linked to users)
3. **categories** - Product categories
4. **products** - Menu items
5. **customers** - Customer loyalty tracking
6. **orders** - Order records
7. **order_items** - Individual items in each order (linked to orders)
8. **cart** - User shopping cart

## After Deployment

1. The app will work with the new schema
2. Orders will properly save order items in the `order_items` table
3. Profile updates will work correctly
4. All CRUD operations should function properly

## Note

If you had existing data in the old schema, you'll need to migrate it or clear the old tables. The new schema is designed to be compatible with the frontend code.
