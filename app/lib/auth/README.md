# Role-Based Access Control System

This system implements a comprehensive role-based access control (RBAC) for the POS system with 4 main user roles.

## User Roles

### 1. عميل (Client)
- **Access**: Store homepage, My orders page only
- **Restrictions**: Cannot access admin pages (POS, dashboard, etc.)

### 2. جملة (Wholesale)  
- **Access**: Store homepage, My orders page only (same as Client)
- **Restrictions**: Cannot access admin pages

### 3. موظف (Employee)
- **Access**: Full access to all pages including admin dashboard and store pages
- **Permissions**: Can manage all system functions

### 4. أدمن رئيسي (Main Admin)
- **Access**: Full access to all pages with complete administrative privileges
- **Permissions**: Complete system control

## Usage Examples

### Protecting Pages with HOC

```tsx
import { withAdminProtection } from '@/app/components/auth/withRoleProtection';

function DashboardPage() {
  return <div>Dashboard Content</div>;
}

export default withAdminProtection(DashboardPage);
```

### Using the Role Access Hook

```tsx
import { useRoleAccess } from '@/app/lib/hooks/useRoleAccess';

function MyComponent() {
  const { userRole, hasAccess, isLoading } = useRoleAccess();
  
  if (isLoading) return <div>Loading...</div>;
  if (!hasAccess) return <div>Unauthorized</div>;
  
  return <div>Authorized content for {userRole}</div>;
}
```

### Manual Access Check

```tsx
import { hasPageAccess } from '@/app/lib/auth/roleBasedAccess';

const canAccess = hasPageAccess('موظف', '/dashboard');
```

## Files Structure

- `roleBasedAccess.ts` - Core access control logic and role definitions
- `useRoleAccess.ts` - React hook for role management
- `withRoleProtection.tsx` - Higher-order component for page protection
- `UnauthorizedAccess.tsx` - Component shown for unauthorized access

## Page Access Rules

### Customer Pages (عميل, جملة)
- `/` - Store homepage ✅
- `/my-orders` - User's orders ✅
- `/store` - Store pages ✅
- `/products` - Product listings ✅
- `/dashboard` - Admin dashboard ❌
- `/pos` - Point of sale ❌

### Admin Pages (موظف, أدمن رئيسي)
- All customer pages ✅
- `/dashboard` - Admin dashboard ✅
- `/pos` - Point of sale ✅
- `/inventory` - Inventory management ✅
- `/customers` - Customer management ✅
- `/suppliers` - Supplier management ✅
- `/safes` - Safes (الخزن) ✅
- `/reports` - Reports ✅
- `/permissions` - Permissions management ✅

## Database Integration

The system automatically updates user roles based on the `is_admin` field in `user_profiles`:
- `is_admin = false` → Role: 'عميل'
- `is_admin = true` → Role: 'أدمن رئيسي'

Users can be manually assigned to 'جملة' or 'موظف' roles through the permissions interface.

## Error Handling

- **Unauthorized Access**: Shows custom error page with appropriate message
- **Loading States**: Displays loading screen while checking permissions
- **Redirect Options**: Can redirect unauthorized users to appropriate pages
- **Role Detection**: Handles missing or invalid role data gracefully