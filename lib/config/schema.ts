/**
 * Schema Configuration
 *
 * هذا الملف يحتوي على إعدادات الـ schema الخاصة بالمشروع
 * لتغيير الـ schema في كل المشروع، غيّر القيمة في SCHEMA_NAME فقط
 */

export const SCHEMA_NAME = 'ringo';

/**
 * استخدام في الاستعلامات
 * مثال: `${SCHEMA_NAME}.products`
 */
export const getSchemaTable = (tableName: string) => `${SCHEMA_NAME}.${tableName}`;

/**
 * للحصول على اسم الـ schema فقط
 */
export const getSchemaName = () => SCHEMA_NAME;
