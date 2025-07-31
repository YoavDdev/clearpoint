# Clearpoint Security - Complete Supabase Database Schema & API Audit

## 🗄️ **Database Tables Overview**

Based on the codebase analysis, here are all the Supabase tables in your system:

### 1. **`users` Table**
**Purpose**: Customer/user management
```sql
- id (UUID, Primary Key)
- email (TEXT, Unique)
- full_name (TEXT)
- plan_id (TEXT) - Plan identifier (e.g., "sim", "wifi")
- phone (TEXT)
- address (TEXT)
- notes (TEXT) - Admin notes
- custom_price (NUMERIC) - Custom pricing override
- plan_duration_days (INTEGER) - Retention period (1, 7, 14 days)
- needs_support (BOOLEAN) - Support flag
- initial_camera_count (INTEGER) - Default: 4
- tunnel_name (TEXT) - Cloudflare tunnel subdomain
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 2. **`cameras` Table**
**Purpose**: Camera management and monitoring
```sql
- id (UUID, Primary Key)
- name (TEXT) - Camera display name
- serial_number (TEXT) - Hardware serial number
- stream_path (TEXT) - RTSP URL
- user_id (UUID, Foreign Key → users.id)
- user_email (TEXT) - Redundant email reference
- image_url (TEXT) - Camera thumbnail/preview
- is_stream_active (BOOLEAN) - Online/offline status
- last_seen_at (TIMESTAMP) - Last health check
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 3. **`support_requests` Table**
**Purpose**: Customer support ticket system
```sql
- id (UUID, Primary Key)
- email (TEXT) - Customer email
- message (TEXT) - Support request content
- category (TEXT) - "technical", "billing", "question", "other"
- file_url (TEXT) - Attached file URL
- is_handled (BOOLEAN) - Ticket status
- user_id (UUID, Foreign Key → users.id, Optional)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 4. **`subscription_requests` Table**
**Purpose**: New customer registration requests from website
```sql
- id (UUID, Primary Key)
- full_name (TEXT)
- email (TEXT)
- phone (TEXT)
- address (TEXT)
- selected_plan (TEXT) - Requested plan
- preferred_date (DATE) - Installation preference
- status (TEXT) - "new", "handled", "deleted"
- admin_notes (TEXT) - Internal admin comments
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 5. **`vod_files` Table** (Inferred from upload scripts)
**Purpose**: Video-on-demand file tracking
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users.id)
- camera_id (UUID, Foreign Key → cameras.id)
- file_name (TEXT) - Original filename
- file_id (TEXT) - Backblaze B2 file ID
- signed_url (TEXT) - Access URL
- timestamp (TIMESTAMP) - Recording time
- file_size (BIGINT) - File size in bytes
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP) - Based on retention policy
```

## 🔌 **API Endpoints Inventory**

### **Admin APIs** (Service Role Key)
```
GET  /api/admin-get-users          - Fetch all users with camera counts
POST /api/admin-create-user        - Create new customer
POST /api/admin-edit-user          - Update customer details
POST /api/admin-delete-user        - Remove customer
POST /api/admin-invite-user        - Send invitation email

GET  /api/admin-all-cameras        - Fetch all cameras (NEW)
POST /api/admin-fetch-cameras      - Fetch cameras for specific user
POST /api/admin-create-camera      - Add new camera
POST /api/admin-delete-camera      - Remove camera

GET  /api/admin-get-support        - Fetch support requests
POST /api/admin-handle-support     - Mark support request as handled
POST /api/admin-mark-support       - Toggle user support flag
```

### **User APIs** (Session-based)
```
GET  /api/user-cameras             - Get user's cameras + tunnel info
GET  /api/user-footage             - Fetch footage for date range
GET  /api/user-footage-dates       - Get available footage dates
GET  /api/user-plan                - Get user's current plan details
```

### **Public APIs**
```
POST /api/submit-support           - Submit support request
GET  /api/plans                    - Get available subscription plans
POST /api/calculate-price          - Calculate custom pricing
```

### **System APIs**
```
GET  /api/camera-health/[id]       - Get camera health metrics
GET  /api/stream-status            - Check streaming status
GET  /api/current-user             - Get current session user
```

### **Admin Management APIs**
```
POST /api/update-request-status    - Update subscription request status
POST /api/update-request-note      - Update admin notes
```

## 🔍 **Database Issues Identified**

### **Camera Count Problem**
The issue you're experiencing (showing 4 cameras instead of 2) is likely due to:

1. **Duplicate/Test Data**: Old camera records in the database
2. **Inconsistent Status**: Cameras with `is_stream_active = null` or `false`
3. **User Association**: Cameras might be associated with wrong users

### **Data Inconsistencies**
1. **Redundant Fields**: `user_email` in cameras table (should use user_id only)
2. **Missing Constraints**: No foreign key constraints visible in code
3. **Status Management**: Boolean vs null handling for `is_stream_active`

## 🛠️ **Recommended Database Cleanup**

### **Step 1: Audit Current Data**
```sql
-- Check all cameras and their status
SELECT 
  c.id, c.name, c.is_stream_active, c.user_id,
  u.full_name, u.email
FROM cameras c
LEFT JOIN users u ON c.user_id = u.id
ORDER BY c.created_at DESC;

-- Check user counts
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_cameras FROM cameras;
SELECT COUNT(*) as active_cameras FROM cameras WHERE is_stream_active = true;
```

### **Step 2: Clean Up Test Data**
```sql
-- Remove cameras without valid users
DELETE FROM cameras 
WHERE user_id NOT IN (SELECT id FROM users);

-- Remove duplicate cameras (keep latest)
DELETE FROM cameras c1 
WHERE c1.id NOT IN (
  SELECT DISTINCT ON (name, user_id) id 
  FROM cameras c2 
  ORDER BY name, user_id, created_at DESC
);
```

### **Step 3: Standardize Status Fields**
```sql
-- Set null is_stream_active to false
UPDATE cameras 
SET is_stream_active = false 
WHERE is_stream_active IS NULL;
```

## 📊 **Database Relationships**

```
users (1) ←→ (N) cameras
users (1) ←→ (N) support_requests
users (1) ←→ (N) vod_files
cameras (1) ←→ (N) vod_files
```

## 🔐 **Security & Permissions**

### **Row Level Security (RLS)**
- Users can only access their own cameras and footage
- Admin APIs bypass RLS using service role key
- Support requests are filtered by user association

### **API Authentication**
- **Admin APIs**: Service role key (full access)
- **User APIs**: NextAuth session validation
- **Public APIs**: No authentication required

## 🎯 **Next Steps for Database Organization**

1. **Run the diagnostic tool** to see exact current data
2. **Clean up test/duplicate cameras** using the delete buttons
3. **Standardize data formats** and constraints
4. **Add proper foreign key constraints** in Supabase dashboard
5. **Implement data validation** in API endpoints
6. **Set up automated cleanup** for expired VOD files

This audit shows your database is well-structured but needs cleanup of test data to show accurate counts in your admin dashboard.
