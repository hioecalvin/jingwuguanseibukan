// Pure validation: no connections, credentials or approval. Direct DB only for now.
export const FINANCE_STAGING_REF='eomubndonbetszdbhsrj';
export function validateFinanceRehearsalTarget(config) {
  const keys=['projectRef','host','port','database','user','sslmode'];
  if(!config||Object.keys(config).length!==keys.length||keys.some(k=>!Object.hasOwn(config,k))||
    config.projectRef!==FINANCE_STAGING_REF||config.host!==`db.${FINANCE_STAGING_REF}.supabase.co`||
    config.port!==5432||config.database!=='postgres'||config.user!=='postgres'||config.sslmode!=='verify-full')
    throw Error('Exact staging direct-database target and verified TLS required');
  // Intentionally no pooler, URL, IP, redirect, environment or default-target fallback.
  // Caller must still verify the server certificate, project identity, read-only
  // preflight, ledger, fresh actor bindings and explicit write approval separately.
  return Object.freeze({...config});
}
