export const TABS = [
  { id: 'carrera', label: 'CARRERA' },
  { id: 'qualy', label: 'QUALY' },
  { id: 'control', label: 'CONTROL' },
  { id: 'boxes', label: 'BOXES' },
  { id: 'calendario', label: 'CALENDARIO' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export const isTabId = (s: string): s is TabId => TABS.some((t) => t.id === s);
