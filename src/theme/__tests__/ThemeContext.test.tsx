import { lightColors, darkColors, withAlpha, resolveIsDark } from '../ThemeContext';

describe('ColorScheme - light palette (Warm Minimal)', () => {
  it('has correct primary and background', () => {
    expect(lightColors.primary).toBe('#C45D3E');
    expect(lightColors.background).toBe('#FAF7F2');
  });

  it('has canvasAlpha 0 for light mode', () => {
    expect(lightColors.canvasAlpha).toBe(0);
  });

  it('has headingFontFamily Playfair Display', () => {
    expect(lightColors.headingFontFamily).toBe('Playfair Display');
  });

  it('has numFontFamily Space Grotesk', () => {
    expect(lightColors.numFontFamily).toBe('Space Grotesk');
  });

  it('has tab bar tokens', () => {
    expect(lightColors.tabBarBackground).toBe('rgba(250,247,242,0.94)');
    expect(lightColors.tabActive).toBe('#C45D3E');
    expect(lightColors.tabInactive).toBe('#B5A899');
  });

  it('has toast tokens', () => {
    expect(lightColors.toastBackground).toBe('#2C2420');
    expect(lightColors.toastText).toBe('#FAF7F2');
  });

  it('has overlay defined', () => {
    expect(lightColors.overlay).toBe('rgba(44,36,32,0.5)');
  });

  it('contains all required ColorScheme keys', () => {
    const requiredKeys: (keyof typeof lightColors)[] = [
      'primary', 'secondary', 'background', 'surface', 'surfaceVariant',
      'text', 'textSecondary', 'textTertiary', 'border',
      'success', 'danger', 'warning', 'again', 'hard', 'good', 'easy',
      'shadow', 'overlay', 'tabBarBackground', 'tabActive', 'tabInactive',
      'toastBackground', 'toastText', 'canvasAlpha',
      'headingFontFamily', 'numFontFamily',
    ];
    for (const key of requiredKeys) {
      expect(lightColors[key]).toBeDefined();
      expect(darkColors[key]).toBeDefined();
    }
  });
});

describe('ColorScheme - dark palette (Glass Neon)', () => {
  it('has correct primary and background', () => {
    expect(darkColors.primary).toBe('#00E5A0');
    expect(darkColors.background).toBe('#08080D');
  });

  it('has canvasAlpha 1 for dark mode', () => {
    expect(darkColors.canvasAlpha).toBe(1);
  });

  it('has transparent shadow', () => {
    expect(darkColors.shadow).toBe('transparent');
  });

  it('has headingFontFamily Space Grotesk', () => {
    expect(darkColors.headingFontFamily).toBe('Space Grotesk');
  });

  it('has numFontFamily JetBrains Mono', () => {
    expect(darkColors.numFontFamily).toBe('JetBrains Mono');
  });

  it('has tab bar tokens', () => {
    expect(darkColors.tabBarBackground).toBe('rgba(8,8,13,0.92)');
    expect(darkColors.tabActive).toBe('#00E5A0');
    expect(darkColors.tabInactive).toBe('#4A4A5A');
  });

  it('has toast tokens', () => {
    expect(darkColors.toastBackground).toBe('rgba(0,229,160,0.15)');
    expect(darkColors.toastText).toBe('#00E5A0');
  });

  it('has overlay defined', () => {
    expect(darkColors.overlay).toBe('rgba(0,0,0,0.7)');
  });

  it('differs from light palette', () => {
    expect(darkColors.primary).not.toBe(lightColors.primary);
    expect(darkColors.background).not.toBe(lightColors.background);
    expect(darkColors.text).not.toBe(lightColors.text);
    expect(darkColors.secondary).not.toBe(lightColors.secondary);
    expect(darkColors.canvasAlpha).not.toBe(lightColors.canvasAlpha);
  });
});

describe('ColorScheme - semantic colors', () => {
  it('has success, danger, warning defined', () => {
    expect(lightColors.success).toBe('#5B8A72');
    expect(lightColors.danger).toBe('#D14D4D');
    expect(lightColors.warning).toBe('#D4A03C');
    expect(darkColors.success).toBe('#3FB950');
    expect(darkColors.danger).toBe('#FF4D5A');
    expect(darkColors.warning).toBe('#F0A840');
  });

  it('has rating colors (again, hard, good, easy)', () => {
    expect(lightColors.again).toBeTruthy();
    expect(lightColors.hard).toBeTruthy();
    expect(lightColors.good).toBeTruthy();
    expect(lightColors.easy).toBeTruthy();
    expect(darkColors.again).toBeTruthy();
    expect(darkColors.hard).toBeTruthy();
    expect(darkColors.good).toBeTruthy();
    expect(darkColors.easy).toBeTruthy();
  });
});

describe('resolveIsDark', () => {
  it('returns true when mode is system and scheme is dark', () => {
    expect(resolveIsDark('system', 'dark')).toBe(true);
  });

  it('returns false when mode is system and scheme is light', () => {
    expect(resolveIsDark('system', 'light')).toBe(false);
  });

  it('returns true when mode is explicit dark', () => {
    expect(resolveIsDark('dark', 'light')).toBe(true);
    expect(resolveIsDark('dark', 'dark')).toBe(true);
    expect(resolveIsDark('dark', null)).toBe(true);
    expect(resolveIsDark('dark', undefined)).toBe(true);
  });

  it('returns false when mode is explicit light', () => {
    expect(resolveIsDark('light', 'dark')).toBe(false);
    expect(resolveIsDark('light', 'light')).toBe(false);
    expect(resolveIsDark('light', null)).toBe(false);
    expect(resolveIsDark('light', undefined)).toBe(false);
  });

  it('returns false when mode is system and scheme is null or undefined', () => {
    expect(resolveIsDark('system', null)).toBe(false);
    expect(resolveIsDark('system', undefined)).toBe(false);
  });
});

describe('withAlpha', () => {
  it('works with Warm Minimal primary', () => {
    expect(withAlpha('#C45D3E', 0.5)).toBe('#C45D3E80');
  });

  it('works with Glass Neon primary', () => {
    expect(withAlpha('#00E5A0', 0.3)).toBe('#00E5A04D');
  });
});
