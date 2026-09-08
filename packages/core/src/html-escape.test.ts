import { describe, expect, it } from 'vitest';
import { escapeHtml, escapeHtmlAttributeUrl, escapeHtmlMultiline } from './html-escape';

describe('escapeHtml', () => {
  it('neutralises tag and attribute delimiters', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
    );
  });

  it('escapes ampersands so entities cannot be smuggled in', () => {
    expect(escapeHtml('&lt;script&gt;')).toBe('&amp;lt;script&amp;gt;');
  });

  it("escapes single quotes used to break out of attributes", () => {
    expect(escapeHtml("' onmouseover='alert(1)")).toBe('&#39; onmouseover=&#39;alert(1)');
  });

  it('returns an empty string for nullish input', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('keeps ordinary text intact', () => {
    expect(escapeHtml('Молоко, орехи (3 шт.)')).toBe('Молоко, орехи (3 шт.)');
  });
});

describe('escapeHtmlMultiline', () => {
  it('escapes markup before converting newlines to line breaks', () => {
    expect(escapeHtmlMultiline('a\n<b>')).toBe('a<br/>&lt;b&gt;');
  });

  it('handles CRLF line endings', () => {
    expect(escapeHtmlMultiline('a\r\nb')).toBe('a<br/>b');
  });
});

describe('escapeHtmlAttributeUrl', () => {
  it('keeps http(s) and image data URLs', () => {
    expect(escapeHtmlAttributeUrl('https://example.org/a.png')).toBe('https://example.org/a.png');
    expect(escapeHtmlAttributeUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('keeps local file and content URIs used by attachments', () => {
    expect(escapeHtmlAttributeUrl('file:///data/user/0/photo.jpg')).toBe(
      'file:///data/user/0/photo.jpg',
    );
  });

  it('drops javascript: and other executable schemes', () => {
    expect(escapeHtmlAttributeUrl('javascript:alert(1)')).toBe('');
    expect(escapeHtmlAttributeUrl('vbscript:msgbox(1)')).toBe('');
  });

  it('drops non-image data URLs', () => {
    expect(escapeHtmlAttributeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('escapes quotes so the attribute cannot be closed early', () => {
    expect(escapeHtmlAttributeUrl('https://e.org/"><script>alert(1)</script>')).toBe(
      'https://e.org/&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });
});
