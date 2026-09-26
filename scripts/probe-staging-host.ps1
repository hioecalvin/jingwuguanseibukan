Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -lt 7) {
  throw "PowerShell 7 or newer is required."
}

$originText = "https://jingwuguanseibukan-staging.vercel.app"
$origin = [Uri]$originText

# Keep this guard exact so this script cannot probe production by accident.
if (
  $origin.Scheme -cne "https" -or
  $origin.IdnHost -cne "jingwuguanseibukan-staging.vercel.app" -or
  $origin.Port -ne 443 -or
  $origin.AbsolutePath -ne "/" -or
  $origin.Query -ne "" -or
  $origin.Fragment -ne ""
) {
  throw "Refusing to probe anything except the approved staging origin."
}

$cases = @(
  [pscustomobject]@{ Name = "public login"; Path = "/login"; Status = @(200); Location = $null; ContentType = ""; BodyPattern = "" }
  [pscustomobject]@{ Name = "public register"; Path = "/register"; Status = @(200); Location = $null; ContentType = ""; BodyPattern = "" }
  [pscustomobject]@{ Name = "public auth error"; Path = "/auth/error"; Status = @(200); Location = $null; ContentType = ""; BodyPattern = "" }
  # Next.js 16 may encode an unauthenticated server-component redirect in a
  # 200 HTML response. Both forms must still target /login.
  [pscustomobject]@{ Name = "protected home"; Path = "/"; Status = @(200, 307); Location = "/login"; ContentType = ""; BodyPattern = "(?s)(NEXT_REDIRECT;replace;/login;307;|url=/login)" }
  [pscustomobject]@{ Name = "protected repository"; Path = "/repository"; Status = @(200, 307); Location = "/login"; ContentType = ""; BodyPattern = "(?s)(NEXT_REDIRECT;replace;/login;307;|url=/login)" }
  [pscustomobject]@{ Name = "protected admin"; Path = "/admin"; Status = @(200, 307); Location = "/login"; ContentType = ""; BodyPattern = "(?s)(NEXT_REDIRECT;replace;/login;307;|url=/login)" }
  [pscustomobject]@{ Name = "email worker route"; Path = "/api/system/email-worker"; Status = @(405); Location = $null; ContentType = ""; BodyPattern = "" }
  [pscustomobject]@{ Name = "push worker route"; Path = "/api/push/send"; Status = @(405); Location = $null; ContentType = ""; BodyPattern = "" }
  [pscustomobject]@{ Name = "push subscription route"; Path = "/api/subscribe"; Status = @(405); Location = $null; ContentType = ""; BodyPattern = "" }
  [pscustomobject]@{ Name = "service worker"; Path = "/sw.js"; Status = @(200); Location = $null; ContentType = "(?i)^(application|text)/(javascript|x-javascript)"; BodyPattern = "" }
  [pscustomobject]@{ Name = "logo asset"; Path = "/js-logo.jpeg"; Status = @(200); Location = $null; ContentType = "(?i)^image/jpeg\b"; BodyPattern = "" }
)

$results = $cases | ForEach-Object -Parallel {
  $case = $_
  $base = $using:originText
  $issues = @()
  $handler = [System.Net.Http.HttpClientHandler]::new()
  $handler.AllowAutoRedirect = $false
  $client = [System.Net.Http.HttpClient]::new($handler)
  $client.Timeout = [TimeSpan]::FromSeconds(30)
  [void]$client.DefaultRequestHeaders.TryAddWithoutValidation(
    "User-Agent",
    "jingwuguanseibukan-staging-readonly-probe/1.0"
  )

  try {
    $response = $client.GetAsync($base + $case.Path).GetAwaiter().GetResult()
    $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $status = [int]$response.StatusCode
    $headers = @{}

    foreach ($pair in $response.Headers) {
      $headers[[string]$pair.Key] = $pair.Value -join ", "
    }
    foreach ($pair in $response.Content.Headers) {
      $headers[[string]$pair.Key] = $pair.Value -join ", "
    }

    if (@($case.Status) -notcontains $status) {
      $issues += "expected status $($case.Status -join '/') but received $status"
    }

    $location = [string]$response.Headers.Location
    if ($case.Location -and $status -eq 307) {
      if (-not $location) {
        $issues += "missing Location header"
      } else {
        $resolved = [Uri]::new([Uri]($base + "/"), $location)
        if ($resolved.PathAndQuery -cne $case.Location) {
          $issues += "expected Location $($case.Location), received $($resolved.PathAndQuery)"
        }
      }
    }

    if ($case.BodyPattern -and $status -eq 200 -and $content -notmatch $case.BodyPattern) {
      $issues += "response did not encode the expected /login redirect"
    }

    $contentType = [string]$headers["Content-Type"]
    if ($case.ContentType -and $contentType -notmatch $case.ContentType) {
      $issues += "unexpected Content-Type '$contentType'"
    }
    if ($case.ContentType -and $content.Length -eq 0) {
      $issues += "asset response was empty"
    }

    [pscustomobject]@{
      Name = $case.Name
      Path = $case.Path
      Status = $status
      Location = $location
      Type = $contentType
      Headers = $headers
      Passed = $issues.Count -eq 0
      Problems = $issues -join "; "
    }
  } catch {
    [pscustomobject]@{
      Name = $case.Name
      Path = $case.Path
      Status = $null
      Location = ""
      Type = ""
      Headers = @{}
      Passed = $false
      Problems = $_.Exception.Message
    }
  } finally {
    $client.Dispose()
    $handler.Dispose()
  }
} -ThrottleLimit 8

$results |
  Select-Object Name, Path, Status, Location, Type, Passed, Problems |
  Format-Table -AutoSize

$probeFailures = @($results | Where-Object { -not $_.Passed })
if ($probeFailures.Count) {
  $summary = ($probeFailures | ForEach-Object {
    "$($_.Name): $($_.Problems)"
  }) -join "; "
  throw "HTTP probe failure: $summary"
}

$loginHeaders = ($results | Where-Object Name -eq "public login").Headers
$requiredHeaders = @(
  @{ Name = "Content-Security-Policy"; Fragments = @("default-src 'self'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'", "upgrade-insecure-requests") }
  @{ Name = "Referrer-Policy"; Fragments = @("strict-origin-when-cross-origin") }
  @{ Name = "Permissions-Policy"; Fragments = @("camera=()", "microphone=()", "geolocation=()") }
  @{ Name = "Strict-Transport-Security"; Fragments = @("max-age=63072000", "includeSubDomains", "preload") }
  @{ Name = "X-Content-Type-Options"; Fragments = @("nosniff") }
  @{ Name = "X-Frame-Options"; Fragments = @("DENY") }
)

$headerFailures = @()
foreach ($requirement in $requiredHeaders) {
  $value = [string]$loginHeaders[$requirement.Name]
  if ([string]::IsNullOrWhiteSpace($value)) {
    $headerFailures += "missing $($requirement.Name)"
    continue
  }
  foreach ($fragment in $requirement.Fragments) {
    if ($value.IndexOf($fragment, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
      $headerFailures += "$($requirement.Name) lacks '$fragment'"
    }
  }
}

if (-not [string]::IsNullOrWhiteSpace([string]$loginHeaders["X-Powered-By"])) {
  $headerFailures += "X-Powered-By must be absent"
}
if ($headerFailures.Count) {
  throw "Security-header failure: $($headerFailures -join '; ')"
}

"PASS: staging-only read-only HTTP probes and security headers succeeded."
