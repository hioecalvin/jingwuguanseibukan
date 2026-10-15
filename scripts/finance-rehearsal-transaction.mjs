// Offline transaction framing shared by the LOCAL harness and staging assembler.
// No client, credentials or execution. Exact reviewed drafts only, not a SQL parser.
import {createHash} from 'node:crypto';
const reviewed=Object.freeze({
  '059':'e2e4defb705cf9216dac32946ca61c029477a9062bf92b7f0ba777d4d070f406',
  '060':'482ad4c3de6126123fac4250978f81c32c368ed50940287ba3a6b03b0a588b5d',
});
export function reviewedMigrationBody(version,source) {
  if(!Object.hasOwn(reviewed,version)||typeof source!=='string'||
    createHash('sha256').update(source).digest('hex')!==reviewed[version])throw Error('Unreviewed migration bytes');
  const sql=source.replaceAll('\r\n','\n');
  const opening=/^(?:\s|--[^\n]*\n)*begin;\s*/i;
  const closing=/\bcommit;\s*$/i;
  if(!opening.test(sql)||!closing.test(sql))throw Error('Expected reviewed transaction envelope');
  return sql.replace(opening,'').replace(closing,'');
}
export function rollbackSentinelSql(nonce) {
  if(typeof nonce!=='string'||!/^[0-9a-f]{32}$/.test(nonce))throw Error('Invalid rehearsal nonce');
  return `reset role;set constraints all immediate;
do $rollback_sentinel$ begin
 raise exception using errcode='Z0590',message='JWG_FINANCE_ROLLBACK_${nonce}';
end $rollback_sentinel$;`;
}
export function isExpectedRollback(result,nonce) {
  rollbackSentinelSql(nonce);
  // A matching error is only evidence that the end was reached. Callers MUST
  // still capture independent baselines and compare before claiming rollback.
  if(result.error||result.status!==3||typeof result.stderr!=='string')return false;
  const errors=result.stderr.split(/\r?\n/).filter(line=>/^ERROR:/.test(line));
  return errors.length===1&&errors[0]===`ERROR:  Z0590: JWG_FINANCE_ROLLBACK_${nonce}`;
}
