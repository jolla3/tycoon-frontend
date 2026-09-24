// src/theme/theme.ts
//
// This is the ONE theme for the application (section 4/69 of the frontend
// spec). Do not create a second theme, a second palette, or per-page color
// overrides — extend this file instead.

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light', // primary environment is ALWAYS light — see section 5/74
    primary: {
      main: '#00B4D8',
      light: '#48CAE4',
      dark: '#0096C7',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#023E8A',
      light: '#0077B6',
      dark: '#03045E',
    },
    background: {
      default: '#F4F6F8',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A202C',
      secondary: '#4A5568',
    },
    success: { main: '#22C55E' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    h1: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600 },
    h2: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600 },
    h3: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600 },
    h4: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 500 },
    h5: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 500 },
    h6: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 500 },
    button: { fontFamily: '"IBM Plex Sans", sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'none' },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 2, padding: '10px 24px', fontSize: '0.875rem' },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00B4D8 0%, #0096C7 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #0096C7 0%, #0077B6 100%)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 6, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00B4D8', borderWidth: 2 },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 4, fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.75rem' } },
    },
    MuiAppBar: {
      styleOverrides: { root: { backgroundColor: '#FFFFFF', color: '#1A202C', boxShadow: 'none', borderBottom: '1px solid #E2E8F0' } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: '#FFFFFF', borderRight: '1px solid #E2E8F0' } },
    },
  },
});

/**
 * Section 7/41 of the redesign mandate: the app must feel layered and
 * bright, not "white card, white card, white card." These are shared CSS
 * background values (NOT MUI theme tokens — sx doesn't support custom
 * palette keys without augmenting the theme type) used directly via `sx`
 * on section/page wrappers. Kept in one place so every page draws from the
 * same restrained set instead of inventing gradients per screen.
 */
export const surfaces = {
  /** Default page canvas — a very subtle cyan-tinted radial wash instead of flat #F4F6F8. */
  pageCanvas:
    'radial-gradient(1200px 480px at 8% -10%, rgba(0,180,216,0.06), transparent 60%), radial-gradient(900px 420px at 110% 0%, rgba(2,62,138,0.05), transparent 55%), #F4F6F8',
  /** Hero / marketing sections — brighter architectural gradient. */
  heroCanvas:
    'linear-gradient(180deg, #FFFFFF 0%, #F0FBFD 40%, #EAF7FA 100%)',
  /** A restrained "data surface" card background used behind charts/KPIs to add depth without going dark. */
  dataSurface: 'linear-gradient(155deg, #FFFFFF 0%, #F7FDFE 100%)',
  /** Thin architectural line motif used as a decorative section divider. */
  lineMotif:
    'repeating-linear-gradient(90deg, rgba(0,180,216,0.08) 0px, rgba(0,180,216,0.08) 1px, transparent 1px, transparent 48px)',
};

export default theme;
