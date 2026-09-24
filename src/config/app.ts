// src/config/app.ts
//
// SINGLE SOURCE for the product's display identity. The frontend does not
// have a permanent product name yet — "Tycoon Estates" is the current
// business/client context, not necessarily the final software brand.
// Every place that would otherwise hardcode a name (topbar, sidebar,
// footer, login, landing, <title>, notifications) must import from here.

export const appConfig = {
  name: 'Property Management',
  shortName: 'Property',
  description: 'Property and rent management platform',
  supportEmail: 'support@example.com',
  currentYear: new Date().getFullYear(),
} as const;
