import { withAlpha } from '../../theme/ThemeContext';

describe('withAlpha', () => {
  test('converts hex to rgba at 50% opacity', () => {
    expect(withAlpha('#4A90D9', 0.5)).toBe('#4A90D980');
  });

  test('full opacity returns original hex', () => {
    expect(withAlpha('#4A90D9', 1)).toBe('#4A90D9FF');
  });

  test('zero opacity returns transparent', () => {
    expect(withAlpha('#4A90D9', 0)).toBe('#4A90D900');
  });

  test('clamps opacity above 1', () => {
    expect(withAlpha('#4A90D9', 1.5)).toBe('#4A90D9FF');
  });

  test('clamps opacity below 0', () => {
    expect(withAlpha('#4A90D9', -0.5)).toBe('#4A90D900');
  });

  test('handles light opacity', () => {
    expect(withAlpha('#6C63FF', 0.15)).toBe('#6C63FF26');
  });

  test('handles 6-char hex', () => {
    expect(withAlpha('#ABC123', 0.2)).toBe('#ABC12333');
  });
});
