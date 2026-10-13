const formatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
});

export const formatDate = (iso: string): string => formatter.format(new Date(iso));

export const SOURCE_LABEL = {
  'heynow-mcp': 'HeyNow (MCP)',
  'heynow-http': 'HeyNow (HTTP)',
  simulator: 'Simulador',
} as const;
