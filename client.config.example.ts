// TEMPLATE: Copy this file to client.config.ts and customize for each client
// DO NOT modify this file directly - it serves as a template

export const CLIENT_CONFIG = {
  // Database Schema - IMPORTANT: Use unique schema name for each client
  schema: 'your_schema_name' as const,
  supabaseProjectId: 'your_supabase_project_id',

  // Branding
  appName: 'Your App Name',
  shortName: 'yourapp',
  companyName: 'Your Company Name',
  description: 'وصف التطبيق الخاص بك',

  // Theme Colors
  themeColor: '#DC2626',
  backgroundColor: '#111827',
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',

  // Logo - Place your logo in /public/assets/logo/
  logoPath: '/assets/logo/your-logo.png',

  // Currency
  defaultCurrency: 'ريال',
  websiteCurrency: 'جنيه',

  // Language
  lang: 'ar',
  dir: 'rtl' as const,
}

export type SchemaName = typeof CLIENT_CONFIG.schema
