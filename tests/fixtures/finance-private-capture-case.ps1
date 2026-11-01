param([Parameter(Mandatory)][string]$Directory,
 [ValidateSet('save','reserve','broad','drift','oversize')][string]$Case='save')
$ErrorActionPreference='Stop';$reservation=$null
try {
 . (Join-Path $PSScriptRoot '../../scripts/finance-private-capture.ps1')
 if($Case -eq 'broad'){
  & (Join-Path $PSScriptRoot 'finance-private-directory-setup.ps1') -Directory $Directory -ExtraReader
 }
 $reservation=New-FinanceCaptureFile $Directory
 if($Case -eq 'reserve'){[Console]::Out.Write('RESERVED');exit 0}
 if($Case -eq 'drift'){
  & (Join-Path $PSScriptRoot 'finance-private-directory-setup.ps1') -Directory $Directory -ExtraReader
 }
 $text='{"synthetic":"private-ledger-payload"}'
 if($Case -eq 'oversize'){$text='x' * 4194305}
 $hash=Save-FinanceCaptureFile $reservation $text
 [Console]::Out.Write(('SAVED '+$hash))
} catch {
 [Console]::Error.Write('CAPTURE_REJECTED');exit 1
} finally {if($reservation){$reservation.Stream.Dispose()}}
