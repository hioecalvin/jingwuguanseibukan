import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const helper=fileURLToPath(new URL('./finance-interactive-input.ps1',import.meta.url));
const channel=fileURLToPath(new URL('./finance-session-witness-capture.ps1',import.meta.url));
const source=readFileSync(helper,'utf8');
test('interactive writes flush explicitly while draining both bounded operations',()=>{
  assert.match(source,/BaseStream\.WriteAsync/);assert.match(source,/BaseStream\.FlushAsync/);
  assert.equal((source.match(/Wait-FinanceWitness \$Channels/g)||[]).length,2);
  assert.ok(source.indexOf('FlushAsync')>source.indexOf('$write.GetAwaiter().GetResult()'));
  assert.doesNotMatch(source,/\.Close\(|\.Kill\(|ProcessStartInfo|PGPASSWORD|Invoke-FinanceProtectedPoolerProcess/);
});
test('Windows interactive small/large writes reach an inert child without EOF or pipe deadlock',
  {skip:process.platform!=='win32',timeout:45000},()=>{
  const root=mkdtempSync(path.join(tmpdir(),'jwg-interactive-input-'));
  const child=path.join(root,'child.cjs'),script=path.join(root,'probe.ps1');
  // The child never connects or reads files. Deliberate backpressure precedes
  // input consumption; the parent must drain it while delivering/flushing input.
  writeFileSync(child,`let n=0;const expected=Number(process.argv[2]);
process.stdout.write('x'.repeat(Number(process.argv[3]))+'\\n',()=>{
 process.stdin.on('data',b=>{n+=b.length;if(n===expected)process.stdout.write(JSON.stringify({received:n})+'\\n');});
 process.stdin.resume();});`);
  const quote=s=>"'"+s.replaceAll("'","''")+"'";
  writeFileSync(script,`$ErrorActionPreference='Stop'
. ${quote(channel)}
. ${quote(helper)}
foreach($case in @(@(9,0),@(500000,700000))){
 $p=$null
 try{
  $s=[Diagnostics.ProcessStartInfo]::new();$s.FileName=${quote(process.execPath)}
  $s.Arguments='"'+${quote(child)}+'" '+$case[0]+' '+$case[1]
  $s.UseShellExecute=$false;$s.CreateNoWindow=$true;$s.RedirectStandardInput=$true;$s.RedirectStandardOutput=$true;$s.RedirectStandardError=$true
  $p=[Diagnostics.Process]::new();$p.StartInfo=$s;[void]$p.Start()
  $o=New-FinanceWitnessChannel $p.StandardOutput 1048576;$e=New-FinanceWitnessChannel $p.StandardError
  Write-FinanceInteractiveInput -Process $p -Text ('a'*$case[0]) -Channels @($o,$e) -TimeoutMs 12000
  Wait-FinanceWitness @($o,$e) {$o.Text.ToString().Contains('received') -or $e.Text.Length -gt 0} 12000
  if($p.HasExited -or $e.Text.Length){throw 'Interactive child not healthy'}
  $lines=$o.Text.ToString().TrimEnd().Split([char]10)
  $row=ConvertFrom-Json $lines[-1]
  if($row.received -ne $case[0]){throw 'Incorrect delivered byte count'}
  $p.StandardInput.BaseStream.Close()
  Wait-FinanceWitness @($o,$e) {$o.Ended -and $e.Ended -and $p.HasExited} 3000
  if($p.ExitCode -ne 0){throw 'Inert child failed'}
 }finally{if($p){try{if(-not $p.HasExited){$p.Kill();[void]$p.WaitForExit(3000)}}finally{$p.Dispose()}}}
}
'INTERACTIVE_FLUSH_VERIFIED'
`);
  const r=spawnSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
    ['-NoProfile','-NonInteractive','-File',script],{encoding:'utf8',windowsHide:true,timeout:42000});
  assert.equal(r.status,0,r.stderr||r.error?.message);assert.match(r.stdout,/INTERACTIVE_FLUSH_VERIFIED/);
});
