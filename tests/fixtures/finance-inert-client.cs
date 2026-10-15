// Test double only: NO networking/database client. Uses synthetic local files.
using System;
using System.IO;
using System.Text;
using System.Security.Cryptography;
public class FinanceInertClient {
 public static int Main(string[] args) {
  string root=AppDomain.CurrentDomain.BaseDirectory;
  try {
   if(Environment.GetEnvironmentVariable("PGPASSWORD")!="SYNTHETIC-NOT-A-LIVE-PASSWORD" ||
      Environment.GetEnvironmentVariable("PGSSLMODE")!="verify-full" ||
      !Environment.GetEnvironmentVariable("PGOPTIONS").Contains("default_transaction_read_only=on") ||
      String.Join(" ",args)!="-X -w -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=terse -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.eomubndonbetszdbhsrj -d postgres") return 21;
   File.AppendAllText(Path.Combine(root,"synthetic-attempts.txt"),"START\n");
   string sql=Console.In.ReadToEnd();
   using(var sha=SHA256.Create()) {
    string hash=BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(sql))).Replace("-","").ToLowerInvariant();
    if(hash!="723e23d15bfcdff8127a39f15550154c4b68e03fc9c30e83fbb231677ae04d80" &&
       hash!="aaf3484bebe54f1dce348507b978261bd3eb0b509756032f615b6e5fe897afb2") return 22;
   }
   Console.OutputEncoding=new UTF8Encoding(false);
   Console.Write(File.ReadAllText(Path.Combine(root,"synthetic-response.json"),Encoding.UTF8)
     .Replace("SYNTHETIC_CAPTURE_TIME",DateTime.UtcNow.ToString("o")));
   return 0;
  } catch {Console.Error.Write("INERT_FIXTURE_FAILED");return 23;}
 }
}
