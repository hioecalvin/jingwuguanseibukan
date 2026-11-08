$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../scripts/finance-preflight-failure.ps1')
# Synthetic strings only; no client or database is started.
$cases=@(
 'password authentication failed for user synthetic-secret',
 'certificate verify failed synthetic-secret',
 'could not translate host name synthetic-secret',
 'Network is unreachable synthetic-secret',
 'connection timed out synthetic-secret',
 'unclassified synthetic-secret',
 ''
)
$result=@($cases | ForEach-Object { Get-FinanceClientFailureCode $_ })
[Console]::Out.Write((ConvertTo-Json -InputObject $result -Compress))
