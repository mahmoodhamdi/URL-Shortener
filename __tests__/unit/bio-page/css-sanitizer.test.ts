import { describe, it, expect } from 'vitest';
import {
  sanitizeCss,
  isValidCss,
  sanitizeCssString,
} from '@/lib/bio-page/css-sanitizer';

describe('CSS Sanitizer', () => {
  describe('sanitizeCss', () => {
    describe('Basic functionality', () => {
      it('should return empty result for null input', () => {
        const result = sanitizeCss(null);
        expect(result.sanitized).toBe('');
        expect(result.warnings).toEqual([]);
        expect(result.removed).toEqual([]);
      });

      it('should return empty result for undefined input', () => {
        const result = sanitizeCss(undefined);
        expect(result.sanitized).toBe('');
      });

      it('should return empty result for empty string', () => {
        const result = sanitizeCss('');
        expect(result.sanitized).toBe('');
      });

      it('should preserve valid CSS', () => {
        const css = '.container { background-color: red; padding: 10px; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('background-color');
        expect(result.sanitized).toContain('padding');
        expect(result.removed).toEqual([]);
      });

      it('should normalize whitespace', () => {
        const css = '.test  {   color:   blue;   }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('  ');
      });

      it('should truncate very long CSS', () => {
        const longCss = 'a'.repeat(60000);
        const result = sanitizeCss(longCss);
        expect(result.sanitized.length).toBeLessThanOrEqual(50000);
        expect(result.warnings.some(w => w.includes('truncated'))).toBe(true);
      });
    });

    describe('Dangerous property removal', () => {
      it('should remove behavior property (IE)', () => {
        const css = '.evil { behavior: url(script.htc); color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('behavior');
        expect(result.sanitized).toContain('color');
        expect(result.removed).toContain('behavior property');
      });

      it('should remove -moz-binding property', () => {
        const css = '.evil { -moz-binding: url(xss.xml#xss); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('-moz-binding');
      });
    });

    describe('Dangerous value removal', () => {
      it('should remove expression() values', () => {
        const css = '.evil { width: expression(alert("xss")); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('expression(');
        expect(result.removed.some(r => r.includes('expression'))).toBe(true);
      });

      it('should remove javascript: URLs', () => {
        const css = '.evil { background: url(javascript:alert(1)); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('javascript:');
      });

      it('should remove vbscript: URLs', () => {
        const css = '.evil { background: url(vbscript:msgbox(1)); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('vbscript:');
      });

      it('should remove data: URLs except images', () => {
        const css = '.evil { background: url(data:text/html,<script>alert(1)</script>); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('about:blank');
      });

      it('should allow data:image URLs', () => {
        const css = '.icon { background: url(data:image/png;base64,abc123); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('data:image/png');
      });
    });

    describe('Dangerous at-rules removal', () => {
      it('should remove @import rules', () => {
        const css = '@import url("http://evil.com/styles.css"); .safe { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('@import');
        expect(result.sanitized).toContain('color');
        expect(result.removed).toContain('@import rules');
      });

      it('should remove @charset rules', () => {
        const css = '@charset "UTF-7"; .test { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('@charset');
      });

      it('should remove @namespace rules', () => {
        const css = '@namespace svg "http://evil.com"; .test { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('@namespace');
      });
    });

    describe('URL sanitization', () => {
      it('should allow https URLs', () => {
        const css = '.bg { background: url(https://example.com/image.png); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('https://example.com/image.png');
      });

      it('should allow relative URLs', () => {
        const css = '.bg { background: url(/images/bg.png); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('/images/bg.png');
      });

      it('should block http URLs', () => {
        const css = '.bg { background: url(http://example.com/image.png); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('about:blank');
      });

      it('should block file:// URLs', () => {
        const css = '.bg { background: url(file:///etc/passwd); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('about:blank');
      });

      it('should handle URLs with quotes', () => {
        const css = '.bg { background: url("https://example.com/image.png"); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('https://example.com');
      });

      it('should handle URLs with single quotes', () => {
        const css = ".bg { background: url('https://example.com/image.png'); }";
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('https://example.com');
      });
    });

    describe('Script injection prevention', () => {
      it('should remove onclick attributes', () => {
        const css = 'div[onclick="alert(1)"] { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('onclick');
        expect(result.removed).toContain('potential script injection');
      });

      it('should remove onerror attributes', () => {
        const css = 'img[onerror="alert(1)"] { display: block; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('onerror');
      });

      it('should remove script tags', () => {
        const css = '<script>alert(1)</script>.test { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('<script>');
      });

      it('should remove style tags', () => {
        const css = '<style>body { display: none; }</style>.test { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('<style>');
      });

      it('should remove link tags', () => {
        const css = '<link rel="stylesheet" href="evil.css">.test { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('<link');
      });

      it('should remove iframe tags', () => {
        const css = '<iframe src="evil.html"></iframe>.test { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('<iframe');
      });
    });

    describe('Control character removal', () => {
      it('should remove null bytes', () => {
        const css = '.test\0 { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('\0');
      });

      it('should remove other control characters', () => {
        const css = '.test\x01\x02\x03 { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toMatch(/[\x01\x02\x03]/);
      });
    });

    describe('HTML comment removal', () => {
      it('should remove HTML comments', () => {
        const css = '<!-- .hidden { display: none; } -->.test { color: red; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).not.toContain('<!--');
        expect(result.sanitized).not.toContain('-->');
        expect(result.removed).toContain('HTML comments');
      });
    });

    describe('Complex CSS handling', () => {
      it('should handle media queries', () => {
        const css = '@media (max-width: 768px) { .container { padding: 10px; } }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('@media');
        expect(result.sanitized).toContain('max-width');
      });

      it('should handle keyframes', () => {
        const css = '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('@keyframes');
      });

      it('should handle pseudo-selectors', () => {
        const css = '.btn:hover { background: blue; } .btn::before { content: ""; }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain(':hover');
        expect(result.sanitized).toContain('::before');
      });

      it('should handle CSS variables', () => {
        const css = ':root { --primary: blue; } .btn { color: var(--primary); }';
        const result = sanitizeCss(css);
        expect(result.sanitized).toContain('--primary');
        expect(result.sanitized).toContain('var(');
      });
    });
  });

  describe('isValidCss', () => {
    it('should return true for safe CSS', () => {
      expect(isValidCss('.test { color: red; }')).toBe(true);
    });

    it('should return true for null/undefined', () => {
      expect(isValidCss(null)).toBe(true);
      expect(isValidCss(undefined)).toBe(true);
    });

    it('should return false for CSS with expression()', () => {
      expect(isValidCss('.evil { width: expression(alert(1)); }')).toBe(false);
    });

    it('should return false for CSS with @import', () => {
      expect(isValidCss('@import url("evil.css");')).toBe(false);
    });

    it('should return false for CSS with javascript:', () => {
      expect(isValidCss('.bg { background: url(javascript:alert(1)); }')).toBe(false);
    });
  });

  describe('sanitizeCssString', () => {
    it('should return only the sanitized string', () => {
      const result = sanitizeCssString('.test { color: red; }');
      expect(typeof result).toBe('string');
      expect(result).toContain('color');
    });

    it('should return empty string for null', () => {
      expect(sanitizeCssString(null)).toBe('');
    });

    it('should strip dangerous content', () => {
      const result = sanitizeCssString('.evil { width: expression(alert(1)); color: red; }');
      expect(result).not.toContain('expression');
      expect(result).toContain('color');
    });
  });
});
