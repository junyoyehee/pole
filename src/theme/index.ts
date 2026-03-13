import { createTheme, MantineColorsTuple } from '@mantine/core';

const violet: MantineColorsTuple = [
  '#f3edff',
  '#e1d5fb',
  '#c4b5fd',
  '#a78bfa',
  '#8b5cf6',
  '#7c3aed',
  '#6d28d9',
  '#5b21b6',
  '#4c1d95',
  '#3b0764',
];

export const theme = createTheme({
  primaryColor: 'violet',
  colors: {
    violet,
    dark: [
      '#EDEDF0',
      '#9898A6',
      '#5C5C72',
      '#44445A',
      '#2A2A36',
      '#24242E',
      '#1A1A20',
      '#131317',
      '#0C0C0F',
      '#080810',
    ],
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', monospace",
  headings: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    fontWeight: '700',
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
  },
  defaultRadius: 'sm',
  cursorType: 'pointer',
});
