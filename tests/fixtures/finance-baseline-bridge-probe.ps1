param([Parameter(Mandatory)][string]$Node)
# Synthetic/offline bridge probe; no credentials or DB process constructed.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../scripts/finance-session-witness-capture.ps1')
. (Join-Path $PSScriptRoot '../../scripts/finance-protected-baseline-capture.ps1')
try {
 $result=Invoke-FinanceBaselineBridge $Node @{mode='plan-inventory'}
 if($result.sql -notlike 'begin isolation level repeatable read read only;*'){throw 'Invalid plan'}
 [Console]::Out.Write('OFFLINE_BRIDGE_PLAN_VERIFIED')
}catch {
 [Console]::Error.Write('OFFLINE_BRIDGE_PLAN_REJECTED');exit 1
}
