export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`ENV ${name} wajib diisi`);
  return value;
}

export function appUrl() {
  return requiredEnv('APP_URL').replace(/\/$/, '');
}

export function dashboardApiKey() {
  return process.env.DASHBOARD_API_KEY || '';
}

export function pakasirFallbackConfig() {
  return {
    project: process.env.PAKASIR_PROJECT_SLUG || '',
    apiKey: process.env.PAKASIR_API_KEY || ''
  };
}
