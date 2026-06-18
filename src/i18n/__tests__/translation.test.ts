import en from '../translations/en.json';
import zh from '../translations/zh.json';

describe('Translations', () => {
  test('every English key has a Chinese translation', () => {
    const missing = Object.keys(en).filter((k) => !(k in zh));
    expect(missing).toEqual([]);
  });

  test('no extra keys in Chinese that are not in English', () => {
    const extra = Object.keys(zh).filter((k) => !(k in en));
    expect(extra).toEqual([]);
  });
});
