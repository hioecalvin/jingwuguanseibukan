param([Parameter(Mandatory)][string]$Directory,[ValidateSet('valid','wrong-target','wrong-sid','empty','created-utc','created-invalid','created-number','created-extra','created-wrong-target')][string]$Variant='valid')
# Synthetic credentials only, never reads or copies an existing protected file.
$ErrorActionPreference='Stop'
& (Join-Path $PSScriptRoot 'finance-private-directory-setup.ps1') -Directory $Directory
$file=Join-Path $Directory 'synthetic.credential.xml'
if(Test-Path -LiteralPath $file){throw 'Refusing overwrite'}
$password=[Security.SecureString]::new()
if($Variant -ne 'empty'){'SYNTHETIC-NOT-A-LIVE-PASSWORD'.ToCharArray()|ForEach-Object{$password.AppendChar($_)}}
$password.MakeReadOnly()
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$record=[pscustomobject]@{schemaVersion=1;target='staging';projectRef='eomubndonbetszdbhsrj';purpose='staging-only';
 windowsSid=$sid;credential=[Management.Automation.PSCredential]::new('eomubndonbetszdbhsrj',$password)}
if($Variant -eq 'wrong-target'){$record.projectRef='not-staging'}
if($Variant -eq 'wrong-sid'){$record.windowsSid='S-1-0-0'}
if($Variant -like 'created-*'){
 $record|Add-Member -NotePropertyName createdUtc -NotePropertyValue ([DateTime]::UtcNow.ToString('o'))
 if($Variant -eq 'created-invalid'){$record.createdUtc='2026-02-30T00:00:00.0000000Z'}
 if($Variant -eq 'created-number'){$record.createdUtc=123}
 if($Variant -eq 'created-extra'){$record|Add-Member -NotePropertyName unreviewed -NotePropertyValue 'not accepted'}
 if($Variant -eq 'created-wrong-target'){$record.projectRef='not-staging'}
}
$record|Export-Clixml -LiteralPath $file -NoClobber
$password.Dispose()
