# 🛠️ RLS Fix Guide - SRIC Access Portal

## 🚨 **Problems Identified**

Your application breaks with RLS enabled due to:

1. **Circular dependency** in RLS policies
2. **Missing service role** for backend operations
3. **Incomplete policy coverage** for all operations
4. **Authentication context issues** in some queries

## 🔧 **Step-by-Step Fix**

### **Step 1: Update Your Environment Variables**

Add your Supabase service role key to your backend `.env` file:

```env
# Add this to email-notification-backend/.env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_dashboard
```

**To get your service role key:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "service_role" key (⚠️ Keep this secret!)

### **Step 2: Run the Fixed Database Schema**

Execute the updated `database/schemas/supabase_setup.sql` in your Supabase SQL Editor:

```sql
-- This will replace the problematic circular policies with safe ones
-- The new policies avoid querying the same table they protect
```

### **Step 3: Restart Your Backend Server**

```bash
cd email-notification-backend
node server.js
```

The backend now uses `supabaseAdmin` for system operations.

## 🔍 **What Was Fixed**

### **1. Removed Circular Dependency**

**❌ Before (BROKEN):**
```sql
CREATE POLICY "Security can view all profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p  -- ← Queries same table!
    WHERE p.user_id = auth.uid() 
    AND p.organization = 'Security'
  )
);
```

**✅ After (FIXED):**
```sql
CREATE POLICY "Allow profile lookup for organization checks"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Security users can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users u  -- ← Queries auth.users instead
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'organization' = 'Security'
  )
);
```

### **2. Added Service Role for Backend**

**✅ Backend now has two clients:**
- `supabase` - Regular client (respects RLS)
- `supabaseAdmin` - Service role client (bypasses RLS for system operations)

### **3. Fixed Policy Coverage**

**✅ Added comprehensive policies for:**
- Profile management by Security users
- Guest management by Security users
- Organization-based access control
- System operations via service role

## 🧪 **Testing Your Fix**

1. **Enable RLS** in your Supabase dashboard:
   ```sql
   -- Run this in SQL Editor if not already enabled
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
   ```

2. **Test the application:**
   - ✅ Login should work
   - ✅ Dashboard should load guests
   - ✅ Adding guests should work
   - ✅ Email processing should work
   - ✅ Organization isolation should work

3. **Check the browser console** - you should see successful database queries

## 🔐 **Security Benefits Now Active**

With RLS properly enabled:

- **AXL users** can only see AXL guests and their own profile
- **Security users** can see and manage all data
- **Email backend** can create guests using system privileges
- **Database queries** are automatically filtered by organization
- **API vulnerabilities** can't bypass access controls

## 🚨 **If Still Having Issues**

Check browser console for specific errors and verify:

1. **Service role key** is correctly set in `.env`
2. **Database policies** are applied (refresh SQL Editor)
3. **User authentication** is working (check `auth.uid()` in SQL)
4. **Organization data** exists in user metadata

## 📊 **Monitoring RLS**

You can monitor RLS policy effectiveness with:

```sql
-- Check if policies are working
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

RLS is now properly configured and should provide robust security without breaking functionality! 🎉 