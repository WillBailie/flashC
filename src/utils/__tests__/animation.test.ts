import { SPRING_CONFIG } from '../animation';

describe('animation utility', () => {
  it('exports a valid spring config', () => {
    expect(SPRING_CONFIG.damping).toBeGreaterThan(0);
    expect(SPRING_CONFIG.stiffness).toBeGreaterThan(0);
    expect(SPRING_CONFIG.mass).toBeGreaterThan(0);
  });

  it('spring config values match the spec', () => {
    expect(SPRING_CONFIG).toEqual({ damping: 15, stiffness: 300, mass: 0.5 });
  });
});
