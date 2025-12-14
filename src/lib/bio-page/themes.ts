/**
 * Bio Page Themes
 *
 * Defines the available themes for bio pages with their respective styles.
 */

export type BioPageTheme = 'DEFAULT' | 'DARK' | 'LIGHT' | 'GRADIENT' | 'MINIMAL' | 'COLORFUL';

export interface ThemeConfig {
  name: string;
  background: string;
  textColor: string;
  linkBackground: string;
  linkTextColor: string;
  linkHoverBackground: string;
  borderRadius: string;
  avatarBorder: string;
}

export const THEMES: Record<BioPageTheme, ThemeConfig> = {
  DEFAULT: {
    name: 'Default',
    background: 'bg-gray-100 dark:bg-gray-900',
    textColor: 'text-gray-900 dark:text-gray-100',
    linkBackground: 'bg-white dark:bg-gray-800',
    linkTextColor: 'text-gray-900 dark:text-gray-100',
    linkHoverBackground: 'hover:bg-gray-50 dark:hover:bg-gray-700',
    borderRadius: 'rounded-lg',
    avatarBorder: 'ring-4 ring-white dark:ring-gray-800',
  },
  DARK: {
    name: 'Dark',
    background: 'bg-gray-950',
    textColor: 'text-white',
    linkBackground: 'bg-gray-800',
    linkTextColor: 'text-white',
    linkHoverBackground: 'hover:bg-gray-700',
    borderRadius: 'rounded-lg',
    avatarBorder: 'ring-4 ring-gray-800',
  },
  LIGHT: {
    name: 'Light',
    background: 'bg-white',
    textColor: 'text-gray-900',
    linkBackground: 'bg-gray-100',
    linkTextColor: 'text-gray-900',
    linkHoverBackground: 'hover:bg-gray-200',
    borderRadius: 'rounded-lg',
    avatarBorder: 'ring-4 ring-gray-100',
  },
  GRADIENT: {
    name: 'Gradient',
    background: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
    textColor: 'text-white',
    linkBackground: 'bg-white/20 backdrop-blur-sm',
    linkTextColor: 'text-white',
    linkHoverBackground: 'hover:bg-white/30',
    borderRadius: 'rounded-full',
    avatarBorder: 'ring-4 ring-white/30',
  },
  MINIMAL: {
    name: 'Minimal',
    background: 'bg-white',
    textColor: 'text-gray-700',
    linkBackground: 'bg-transparent border border-gray-300',
    linkTextColor: 'text-gray-700',
    linkHoverBackground: 'hover:bg-gray-50',
    borderRadius: 'rounded-none',
    avatarBorder: 'ring-2 ring-gray-200',
  },
  COLORFUL: {
    name: 'Colorful',
    background: 'bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500',
    textColor: 'text-white',
    linkBackground: 'bg-white',
    linkTextColor: 'text-gray-900',
    linkHoverBackground: 'hover:bg-gray-100',
    borderRadius: 'rounded-2xl',
    avatarBorder: 'ring-4 ring-white shadow-lg',
  },
};

export function getThemeConfig(theme: BioPageTheme): ThemeConfig {
  return THEMES[theme] || THEMES.DEFAULT;
}

export function getAllThemes(): { theme: BioPageTheme; config: ThemeConfig }[] {
  return Object.entries(THEMES).map(([theme, config]) => ({
    theme: theme as BioPageTheme,
    config,
  }));
}

// Social link icons mapping
export const SOCIAL_PLATFORMS = [
  { key: 'twitter', name: 'Twitter / X', icon: '𝕏' },
  { key: 'instagram', name: 'Instagram', icon: '📷' },
  { key: 'tiktok', name: 'TikTok', icon: '🎵' },
  { key: 'youtube', name: 'YouTube', icon: '▶️' },
  { key: 'facebook', name: 'Facebook', icon: '📘' },
  { key: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { key: 'github', name: 'GitHub', icon: '🐙' },
  { key: 'email', name: 'Email', icon: '✉️' },
  { key: 'website', name: 'Website', icon: '🌐' },
] as const;

export type SocialPlatform = typeof SOCIAL_PLATFORMS[number]['key'];

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  linkedin?: string;
  github?: string;
  email?: string;
  website?: string;
}
