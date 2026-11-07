# Returns a fixed category only. Never echo raw client errors or caller input.
function Get-FinanceClientFailureCode([string]$ClientError) {
 if($ClientError -match '(?i)password authentication failed|no password supplied'){return 'AUTHENTICATION_FAILED'}
 if($ClientError -match '(?i)certificate verify failed|certificate verification failed|root certificate|does not match host name|SSL error|server does not support SSL'){return 'TLS_FAILED'}
 if($ClientError -match '(?i)could not translate host name|could not resolve host|Name or service not known|No such host'){return 'DNS_FAILED'}
 if($ClientError -match '(?i)Network is unreachable|No route to host|Connection refused|connection timed out|timeout expired'){return 'NETWORK_UNAVAILABLE'}
 return 'CLIENT_FAILED'
}
