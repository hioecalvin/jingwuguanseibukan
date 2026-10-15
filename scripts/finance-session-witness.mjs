// Read-only transport diagnostic preparation. No connection or write authority.
// The primary transaction stays open while the observer takes its witness.
function validateNonce(nonce){if(typeof nonce!=='string'||!/^[a-f0-9]{32}$/.test(nonce))throw Error('Fixed witness nonce required');}
const app=nonce=>'jwg-finance-witness-'+nonce;
export function buildFinanceSessionWitnessSql(nonce,peerPid) {
  validateNonce(nonce);
  if(peerPid!==undefined&&(!Number.isInteger(peerPid)||peerPid<1))throw Error('Valid peer PID required');
  const peer=peerPid===undefined?'null':`(select jsonb_build_object('pid',pid,'backendStart',backend_start,
    'transactionStart',xact_start,'database',datname,'user',usename,'state',state,'applicationName',application_name)
    from pg_stat_activity where pid=${peerPid} and application_name='${app(nonce)}')`;
  return `begin read only;
set local search_path=pg_catalog;
set local timezone='UTC';
set local statement_timeout='10s';
set local idle_in_transaction_session_timeout='20s';
set local application_name='${peerPid===undefined?app(nonce):'jwg-finance-observer-'+nonce}';
select jsonb_build_object('nonce','${nonce}','capturedAt',clock_timestamp(),
 'database',current_database(),'sessionUser',session_user,'address',host(inet_server_addr()),'port',inet_server_port(),
 'backendPid',pg_backend_pid(),'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'backendStart',(select backend_start from pg_stat_activity where pid=pg_backend_pid()),
 'transactionStart',(select xact_start from pg_stat_activity where pid=pg_backend_pid()),
 'peer',${peer});
${peerPid===undefined?'':'rollback;\n'}`;
}
export function verifyFinanceSessionWitness(primary,observer,{nonce,nowMs=Date.now(),localProbe=false}={}) {
  validateNonce(nonce);
  const date=value=>typeof value==='string'?Date.parse(value):NaN;
  for(const row of [primary,observer]){
    if(!row||row.nonce!==nonce||row.database!=='postgres'||row.sessionUser!=='postgres'||row.readOnly!=='on'||
      !Number.isInteger(row.backendPid)||row.backendPid<1||!Number.isInteger(row.port)||row.port<1||row.port>65535||
      typeof row.address!=='string'||!row.address||(!localProbe&&row.ssl!==true)||
      (localProbe&&row.address!=='127.0.0.1')||![row.capturedAt,row.backendStart,row.transactionStart].every(x=>Number.isFinite(date(x)))||
      !Number.isFinite(nowMs)||nowMs-date(row.capturedAt)>300000||date(row.capturedAt)>nowMs+30000||
      date(row.backendStart)>date(row.transactionStart)||date(row.transactionStart)>date(row.capturedAt))
      throw Error('Incomplete or stale read-only session witness');
  }
  if(primary.backendPid===observer.backendPid)throw Error('Distinct simultaneous backends required');
  if(primary.address!==observer.address||primary.port!==observer.port)throw Error('Different database server endpoints');
  const peer=observer.peer;
  if(primary.peer!==null||!peer||peer.pid!==primary.backendPid||peer.backendStart!==primary.backendStart||
    peer.transactionStart!==primary.transactionStart||peer.database!=='postgres'||peer.user!=='postgres'||
    peer.state!=='idle in transaction'||peer.applicationName!==app(nonce)||
    date(observer.transactionStart)<date(primary.capturedAt)||date(observer.capturedAt)<date(primary.capturedAt))
    throw Error('Live primary transaction was not independently witnessed');
  return {scope:localProbe?'synthetic-loopback-session-witness':'offline-session-witness',
    distinctBackends:true,overlappingReadOnlyTransactions:true,remoteContact:false,
    liveTransportAuthenticated:false,rollbackVerified:false,readyForWriteRehearsal:false};
}
