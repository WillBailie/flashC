export type Language = 'en' | 'zh';

export const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'zh', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
];
