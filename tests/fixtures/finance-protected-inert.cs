// Test-only binary. No database or network code; only synthetic credential accepted.
using System;
using System.IO;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
public static class FinanceProtectedInert {
 public static int Main(string[] args) {
  Console.OutputEncoding=new UTF8Encoding(false);
  var root=Path.GetDirectoryName(typeof(FinanceProtectedInert).Assembly.Location);
  File.AppendAllText(Path.Combine(root,"started.txt"),Process.GetCurrentProcess().Id+"\n");
  if(Environment.GetEnvironmentVariable("PGPASSWORD")!="SYNTHETIC-NOT-A-LIVE-PASSWORD")return 91;
  foreach(var key in new[]{"NODE_OPTIONS","SUPABASE_SECRET_KEY","PGHOSTADDR","PGSERVICE","PGPASSFILE"})
   if(Environment.GetEnvironmentVariable(key)!=null)return 92;
  byte[] bytes;
  using(var stream=new MemoryStream()){Console.OpenStandardInput().CopyTo(stream);bytes=stream.ToArray();}
  var mode=Encoding.UTF8.GetString(bytes);
  if(File.Exists(Path.Combine(root,"controller-mode.txt"))){
   var phase=Environment.GetEnvironmentVariable("PGAPPNAME")=="jwg-finance-pooler-rehearsal"?"mutation":(mode.Contains("pg_xact_status")?"closure":"baseline");
   if(phase=="baseline" && mode.Contains("from supabase_migrations.schema_migrations"))phase="ledger";
   if(phase=="baseline" && mode.Contains("'actors',(select"))phase="actors";
   string digest;using(var sha=SHA256.Create())digest=BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();
   if(digest!=File.ReadAllText(Path.Combine(root,phase+".sha")))return 93;
   if(!File.Exists(Path.Combine(root,"finance-059-060-attempt.json")) ||
      !File.Exists(Path.Combine(root,"pooler-"+phase+"-capture.json")))return 94;
   Console.WriteLine(File.ReadAllText(Path.Combine(root,phase+".json")).Replace("CAPTURE_TIME",DateTime.UtcNow.ToString("o")));
   if(phase=="mutation"){
    Console.Error.WriteLine(File.ReadAllText(Path.Combine(root,"mutation.stderr")));return 3;
   }
   return 0;
  }
  if(mode=="oversized"){Console.Write("SYNTHETIC-PRIVATE-OUTPUT"+new string('x',1048577));return 0;}
  if(mode=="invalid-utf8"){Console.OpenStandardOutput().WriteByte(255);return 0;}
  if(mode=="timeout"){System.Threading.Thread.Sleep(60000);return 0;}
  Console.WriteLine("CREDENTIAL_VALID");
  foreach(var arg in args)Console.WriteLine("ARG="+arg);
  foreach(var key in new[]{"PGSSLMODE","PGSSLROOTCERT","PGOPTIONS","PGAPPNAME","PGCLIENTENCODING"})
   Console.WriteLine(key+"="+Environment.GetEnvironmentVariable(key));
  using(var sha=SHA256.Create())Console.WriteLine("INPUT="+BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").ToLowerInvariant());
  if(mode=="rollback"){Console.Error.WriteLine("ERROR:  Z0590: JWG_FINANCE_ROLLBACK_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");return 3;}
  return 0;
 }
}
