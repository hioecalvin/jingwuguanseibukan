// NO network access. Local synthetic DPAPI/test files only.
using System;
using System.IO;
using System.Text;
using System.Security.Cryptography;
using System.Diagnostics;
using System.Threading;
public class FinanceBaselineInert {
 public static int Main(string[] args) {
  string root=AppDomain.CurrentDomain.BaseDirectory;
  try {
   if(Environment.GetEnvironmentVariable("PGPASSWORD")!="SYNTHETIC-NOT-A-LIVE-PASSWORD" ||
    Environment.GetEnvironmentVariable("PGSSLMODE")!="verify-full" ||
    !Environment.GetEnvironmentVariable("PGOPTIONS").Contains("default_transaction_read_only=on") ||
    Environment.GetEnvironmentVariable("NODE_OPTIONS")!=null ||
    String.Join(" ",args)!="-X -w -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=terse -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.eomubndonbetszdbhsrj -d postgres") return 21;
   File.AppendAllText(Path.Combine(root,"started.txt"),Process.GetCurrentProcess().Id+"\n");
   Console.InputEncoding=new UTF8Encoding(false,true);Console.OutputEncoding=new UTF8Encoding(false);
   string sql=Console.In.ReadToEnd();
   using(var sha=SHA256.Create()) {
    string hash=BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(sql))).Replace("-","").ToLowerInvariant();
    if(hash!=File.ReadAllText(Path.Combine(root,"expected-sql-sha.txt")))return 22;
   }
   string mode=File.ReadAllText(Path.Combine(root,"mode.txt"));
   if(mode=="timeout"){Thread.Sleep(60000);return 23;}
   if(mode=="stderr"){Console.Error.Write("SYNTHETIC-PRIVATE-ERROR");return 24;}
   if(mode=="oversized"){Console.Out.Write(new string('x',1100000));return 25;}
   if(mode=="malformed"){Console.Out.Write("NOT JSON");return 0;}
   Console.Out.Write(File.ReadAllText(Path.Combine(root,"response.json"),Encoding.UTF8)
    .Replace("SYNTHETIC_CAPTURE_TIME",DateTime.UtcNow.ToString("o")));
   return 0;
  }catch {Console.Error.Write("INERT_BASELINE_FAILED");return 26;}
 }
}
