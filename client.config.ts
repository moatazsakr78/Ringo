// Client-specific configuration - DO NOT commit this file
// Copy from client.config.example.ts and customize for each client

export const CLIENT_CONFIG = {
  // Database Schema
  schema: 'ringo' as const,
  supabaseProjectId: 'hecedrbnbknohssgaoso',

  // Branding
  appName: 'Ringo Store',
  shortName: 'ringo',
  companyName: 'Ringo',
  description: 'متجرك المتكامل للحصول على أفضل المنتجات بأسعار مميزة وجودة عالية',

  // Theme Colors
  themeColor: '#DC2626',
  backgroundColor: '#111827',
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',

  // Logo
  logoPath: '/assets/logo/ringo.png',

  // Currency
  defaultCurrency: 'ريال',
  websiteCurrency: 'جنيه',

  // Language
  lang: 'ar',
  dir: 'rtl' as const,
}

export type SchemaName = typeof CLIENT_CONFIG.schema
