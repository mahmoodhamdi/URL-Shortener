import { describe, it, expect } from 'vitest';
import {
  THEMES,
  getThemeConfig,
  getAllThemes,
  SOCIAL_PLATFORMS,
  BioPageTheme,
} from '@/lib/bio-page/themes';

describe('Bio Page Themes', () => {
  describe('THEMES', () => {
    it('should have all 6 themes defined', () => {
      const themes: BioPageTheme[] = ['DEFAULT', 'DARK', 'LIGHT', 'GRADIENT', 'MINIMAL', 'COLORFUL'];
      themes.forEach(theme => {
        expect(THEMES[theme]).toBeDefined();
      });
    });

    it('should have required properties for each theme', () => {
      Object.values(THEMES).forEach(config => {
        expect(config.name).toBeDefined();
        expect(typeof config.name).toBe('string');
        expect(config.background).toBeDefined();
        expect(config.textColor).toBeDefined();
        expect(config.linkBackground).toBeDefined();
        expect(config.linkTextColor).toBeDefined();
        expect(config.linkHoverBackground).toBeDefined();
        expect(config.borderRadius).toBeDefined();
        expect(config.avatarBorder).toBeDefined();
      });
    });

    it('DEFAULT theme should have correct name', () => {
      expect(THEMES.DEFAULT.name).toBe('Default');
    });

    it('DARK theme should have correct name', () => {
      expect(THEMES.DARK.name).toBe('Dark');
    });

    it('LIGHT theme should have correct name', () => {
      expect(THEMES.LIGHT.name).toBe('Light');
    });

    it('GRADIENT theme should have correct name', () => {
      expect(THEMES.GRADIENT.name).toBe('Gradient');
    });

    it('MINIMAL theme should have correct name', () => {
      expect(THEMES.MINIMAL.name).toBe('Minimal');
    });

    it('COLORFUL theme should have correct name', () => {
      expect(THEMES.COLORFUL.name).toBe('Colorful');
    });
  });

  describe('getThemeConfig', () => {
    it('should return correct config for DEFAULT theme', () => {
      const config = getThemeConfig('DEFAULT');
      expect(config.name).toBe('Default');
    });

    it('should return correct config for DARK theme', () => {
      const config = getThemeConfig('DARK');
      expect(config.name).toBe('Dark');
      expect(config.background).toContain('gray-950');
    });

    it('should return correct config for GRADIENT theme', () => {
      const config = getThemeConfig('GRADIENT');
      expect(config.name).toBe('Gradient');
      expect(config.background).toContain('gradient');
    });

    it('should return DEFAULT config for invalid theme', () => {
      // @ts-expect-error Testing invalid input
      const config = getThemeConfig('INVALID');
      expect(config.name).toBe('Default');
    });
  });

  describe('getAllThemes', () => {
    it('should return array of all themes', () => {
      const themes = getAllThemes();
      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBe(6);
    });

    it('should return objects with theme and config properties', () => {
      const themes = getAllThemes();
      themes.forEach(item => {
        expect(item.theme).toBeDefined();
        expect(item.config).toBeDefined();
        expect(item.config.name).toBeDefined();
      });
    });

    it('should include DEFAULT theme', () => {
      const themes = getAllThemes();
      const defaultTheme = themes.find(t => t.theme === 'DEFAULT');
      expect(defaultTheme).toBeDefined();
      expect(defaultTheme?.config.name).toBe('Default');
    });

    it('should include all theme types', () => {
      const themes = getAllThemes();
      const themeNames = themes.map(t => t.theme);
      expect(themeNames).toContain('DEFAULT');
      expect(themeNames).toContain('DARK');
      expect(themeNames).toContain('LIGHT');
      expect(themeNames).toContain('GRADIENT');
      expect(themeNames).toContain('MINIMAL');
      expect(themeNames).toContain('COLORFUL');
    });
  });

  describe('SOCIAL_PLATFORMS', () => {
    it('should have array of social platforms', () => {
      expect(Array.isArray(SOCIAL_PLATFORMS)).toBe(true);
      expect(SOCIAL_PLATFORMS.length).toBeGreaterThan(0);
    });

    it('should have required properties for each platform', () => {
      SOCIAL_PLATFORMS.forEach(platform => {
        expect(platform.key).toBeDefined();
        expect(typeof platform.key).toBe('string');
        expect(platform.name).toBeDefined();
        expect(typeof platform.name).toBe('string');
        expect(platform.icon).toBeDefined();
      });
    });

    it('should include common social platforms', () => {
      const keys = SOCIAL_PLATFORMS.map(p => p.key);
      expect(keys).toContain('twitter');
      expect(keys).toContain('instagram');
      expect(keys).toContain('youtube');
      expect(keys).toContain('facebook');
      expect(keys).toContain('linkedin');
      expect(keys).toContain('github');
      expect(keys).toContain('email');
    });

    it('should have Twitter/X platform', () => {
      const twitter = SOCIAL_PLATFORMS.find(p => p.key === 'twitter');
      expect(twitter).toBeDefined();
      expect(twitter?.name).toContain('Twitter');
    });

    it('should have Instagram platform', () => {
      const instagram = SOCIAL_PLATFORMS.find(p => p.key === 'instagram');
      expect(instagram).toBeDefined();
      expect(instagram?.name).toBe('Instagram');
    });

    it('should have TikTok platform', () => {
      const tiktok = SOCIAL_PLATFORMS.find(p => p.key === 'tiktok');
      expect(tiktok).toBeDefined();
      expect(tiktok?.name).toBe('TikTok');
    });
  });
});
