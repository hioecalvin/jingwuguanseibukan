# Offline verification only. Never print the returned binding object/UUIDs.
function Get-FinanceIdentityBinding($Snapshot){
 $captured=[DateTimeOffset]::Parse($Snapshot.capturedAt,[Globalization.CultureInfo]::InvariantCulture)
 $age=([DateTimeOffset]::UtcNow-$captured).TotalSeconds
 if($age -gt 300 -or $age -lt -30 -or $Snapshot.database -cne 'postgres' -or
   $Snapshot.sessionUser -cne 'postgres' -or $Snapshot.readOnly -cne 'on' -or
   $Snapshot.ssl -isnot [bool] -or $Snapshot.ssl -ne $true -or
   $Snapshot.backendPid -le 0 -or @($Snapshot.identities).Count -ne 3){throw 'Invalid identity capture'}
 $bindings=[ordered]@{}
 foreach($pair in @(@('member','0101'),@('admin','0002'),@('superAdmin','0001'))){
  $rows=@($Snapshot.identities|Where-Object{$_.role -ceq $pair[0] -and $_.jsId -ceq $pair[1]})
  if($rows.Count -ne 1){throw 'Missing or duplicate identity'}
  $row=$rows[0];$auth=@($row.authIds);$profiles=@($row.profiles)
  if($auth.Count -ne 1 -or $profiles.Count -ne 1){throw 'Ambiguous identity'}
  $p=$profiles[0];$id=$auth[0]
  if($id -isnot [string] -or $id -cnotmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' -or
    $id -eq '00000000-0000-0000-0000-000000000000' -or $p.id -cne $id -or
    $p.accountStatus -cne 'active' -or $p.deceased -isnot [bool] -or $p.deceased -ne $false -or
    $p.superAdmin -isnot [bool] -or $p.superAdmin -ne ($pair[0] -ceq 'superAdmin') -or
    ($p.activeAssignments -isnot [int] -and $p.activeAssignments -isnot [long]) -or $p.activeAssignments -lt 0){throw 'Identity eligibility mismatch'}
  if(($pair[0] -ceq 'member' -and $p.activeAssignments -ne 0) -or
     ($pair[0] -ceq 'admin' -and $p.activeAssignments -lt 1)){throw 'Unexpected role scope'}
  $bindings[$pair[0]]=$id
 }
 if(@($bindings.Values|Select-Object -Unique).Count -ne 3){throw 'Actors must be distinct'}
 return [ordered]@{schemaVersion=1;projectRef='eomubndonbetszdbhsrj';bindings=$bindings}
}
