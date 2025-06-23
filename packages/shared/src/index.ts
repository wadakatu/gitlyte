// Types
export type { RepoData, DesignTokens, LayoutType, ComponentProps } from './types/index.js';

// Design System
export { designTokens, generateCSSVariables } from './styles/design-tokens.js';

// Layout constants
export const LAYOUT_TYPES = [
  { id: 'minimal', name: 'Minimal', description: 'Clean and simple design' },
  { id: 'hero-focused', name: 'Hero Focused', description: 'Prominent hero section' },
  { id: 'grid', name: 'Grid', description: 'Grid-based layout' },
  { id: 'sidebar', name: 'Sidebar', description: 'Sidebar navigation' },
  { id: 'content-heavy', name: 'Content Heavy', description: 'Dense content layout' }
] as const;

// Utility functions
export function getLayoutById(id: string) {
  return LAYOUT_TYPES.find(layout => layout.id === id);
}

export function isValidLayoutId(id: string): boolean {
  return LAYOUT_TYPES.some(layout => layout.id === id);
}