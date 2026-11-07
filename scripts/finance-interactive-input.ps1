# Internal interactive-pipe helper. No client creation, credentials, SQL generation
# or execution authority. The caller pins the input and owns cleanup/evidence.
# Requires finance-session-witness-capture.ps1 for bounded asynchronous draining.
function Write-FinanceInteractiveInput {
 [CmdletBinding()]
 param(
  [Parameter(Mandatory)]$Process,
  [Parameter(Mandatory)][string]$Text,
  [Parameter(Mandatory)][array]$Channels,
  [ValidateRange(1,15000)][int]$TimeoutMs=15000
 )
 if($Channels.Count -lt 1 -or $Channels.Count -gt 6 -or $Text.Contains([string][char]0) -or
    $Text.StartsWith([string][char]0xFEFF,[StringComparison]::Ordinal)){throw 'Invalid interactive input'}
 $bytes=[Text.UTF8Encoding]::new($false,$true).GetBytes($Text)
 if($bytes.Length -lt 1 -or $bytes.Length -gt 4194304){throw 'Interactive input exceeds bound'}
 # WriteAsync may complete into FileStream's small-write buffer WITHOUT delivering
 # anything to the child. Unlike an EOF path, an interactive client stays open:
 # explicitly flush, and drain output while BOTH operations are pending.
 $write=$Process.StandardInput.BaseStream.WriteAsync($bytes,0,$bytes.Length)
 Wait-FinanceWitness $Channels {$write.IsCompleted} $TimeoutMs
 [void]$write.GetAwaiter().GetResult()
 $flush=$Process.StandardInput.BaseStream.FlushAsync()
 Wait-FinanceWitness $Channels {$flush.IsCompleted} $TimeoutMs
 [void]$flush.GetAwaiter().GetResult()
}
