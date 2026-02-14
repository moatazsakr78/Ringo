/**
 * Template Configuration
 *
 * This file controls which template is active for the store.
 * Templates allow complete customization of the store design
 * while keeping the engine logic separate.
 *
 * IMPORTANT: This file should NOT be changed during git rebase
 * to preserve your custom template selection.
 */

// Active template name - change this to switch templates
export const ACTIVE_TEMPLATE = 'default';

// Template metadata type
export interface TemplateInfo {
  name: string;
  description: string;
  author?: string;
  version?: string;
}

// Available templates registry
export const TEMPLATES: Record<string, TemplateInfo> = {
  default: {
    name: 'Default Template',
    description: 'القالب الافتراضي للمتجر',
    author: 'Ringo',
    version: '1.0.0'
  }
};

/**
 * Get template components dynamically
 * Use this function to load template components at runtime
 */
export async function getTemplateComponents() {
  return import(`./templates/${ACTIVE_TEMPLATE}`);
}

/**
 * Get current template info
 */
export function getCurrentTemplateInfo(): TemplateInfo {
  return TEMPLATES[ACTIVE_TEMPLATE] || TEMPLATES.default;
}
