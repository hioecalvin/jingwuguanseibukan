import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
// Read-only Windows ACL adapter, used by the journal. No settings changes.
export function assertFinancePrivateDirectory(directory) {
  if(process.platform!=='win32'||typeof directory!=='string'||!path.isAbsolute(directory))return false;
  const windowsRoot=process.env.SystemRoot;
  if(typeof windowsRoot!=='string'||!path.isAbsolute(windowsRoot))return false;
  const result=spawnSync(path.join(windowsRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
    ['-NoLogo','-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./finance-private-directory.ps1',import.meta.url)),
      '-Directory',directory],
    {windowsHide:true,encoding:'utf8',timeout:10000,maxBuffer:8192,
      env:{SystemRoot:windowsRoot,WINDIR:windowsRoot,TEMP:process.env.TEMP??'',TMP:process.env.TMP??''}});
  return !result.error&&result.status===0&&result.stdout==='PRIVATE_DIRECTORY_VERIFIED'&&result.stderr==='';
}
