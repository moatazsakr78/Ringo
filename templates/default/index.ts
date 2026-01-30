/**
 * Default Template - Component Exports
 *
 * This file exports all template components for the default store template.
 * Templates provide the visual design layer while the engine provides the logic.
 *
 * To create a new template:
 * 1. Create a new folder in templates/ (e.g., templates/modern/)
 * 2. Copy this index.ts and all component files
 * 3. Customize the components as needed
 * 4. Update template.config.ts to use your new template
 */

// Main Page Components - These define the layout for each device type
export { default as MobileHome } from './MobileHome';
export { default as TabletHome } from './TabletHome';
export { default as DesktopHome } from './DesktopHome';

// UI Components - Reusable design elements
export { default as CategoryCarousel } from './CategoryCarousel';
export { default as ProductCarousel } from './ProductCarousel';
export { default as CustomSectionCarousel } from './CustomSectionCarousel';
export { default as FeaturedProductsCarousel } from './FeaturedProductsCarousel';
export { default as SearchOverlay } from './SearchOverlay';
export { default as QuantityModal } from './QuantityModal';
export { default as SocialMediaGrid } from './SocialMediaGrid';
export { default as ShapeSelector } from './ShapeSelector';
export { default as FavoriteButton } from './FavoriteButton';
export { default as ProductVoteModal } from './ProductVoteModal';

// Re-export types for convenience
export type { UserInfo, Product, ProductColor, ProductShape, ProductSize } from '@/components/website/shared/types';
