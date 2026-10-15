// NO networking. Only synthetic credentials and local fixture files are accepted.
using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Web.Script.Serialization;
public class FinanceWitnessInert {
 public static int Main(string[] args) {
  string root=AppDomain.CurrentDomain.BaseDirectory;
  if(Environment.GetEnvironmentVariable("PGPASSWORD")!="SYNTHETIC-NOT-A-LIVE-PASSWORD" ||
   Environment.GetEnvironmentVariable("PGSSLMODE")!="verify-full" ||
   Environment.GetEnvironmentVariable("PGOPTIONS").IndexOf("default_transaction_read_only=on")<0 ||
   string.Join(" ",args)!="-X -w -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=terse -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.eomubndonbetszdbhsrj -d postgres") return 81;
  File.AppendAllText(Path.Combine(root,"started.txt"),Process.GetCurrentProcess().Id+"\n");
  string mode=File.ReadAllText(Path.Combine(root,"mode.txt"));
  StringBuilder sql=new StringBuilder();string line;
  while((line=Console.ReadLine())!=null){sql.Append(line+"\n");if(line.EndsWith(");"))break;}
  string query=sql.ToString();
  Match match=Regex.Match(query,"set local application_name='jwg-finance-(witness|observer)-([a-f0-9]{32})';");
  if(!match.Success || !query.StartsWith("begin read only;\n") || query.IndexOf("statement_timeout='10s'")<0) return 82;
  bool observer=match.Groups[1].Value=="observer";
  File.WriteAllText(Path.Combine(root,observer?"observer.sql":"primary.sql"),query+(observer?Console.In.ReadToEnd():""));
  if((mode=="primary-timeout"&&!observer)||(mode=="observer-timeout"&&observer)){Thread.Sleep(60000);return 83;}
  if(mode=="stderr"&&observer){Console.Error.Write("SYNTHETIC-RAW-ERROR-SECRET");return 84;}
  if(mode=="oversized"&&observer){Console.Out.Write(new string('x',100000));return 85;}
  if(mode=="early-exit"&&!observer)return 86;
  var serializer=new JavaScriptSerializer();
  string stamp=DateTime.UtcNow.ToString("o");
  var row=new Dictionary<string,object>{{"nonce",match.Groups[2].Value},{"capturedAt",stamp},
   {"database","postgres"},{"sessionUser","postgres"},{"address","192.0.2.1"},{"port",5432},
   {"backendPid",observer?102:101},{"readOnly","on"},{"ssl",true},
   {"backendStart",stamp},{"transactionStart",stamp},{"peer",null}};
  if(observer){
   var primary=serializer.Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(root,"primary.json")));
   row["peer"]=new Dictionary<string,object>{{"pid",primary["backendPid"]},{"backendStart",primary["backendStart"]},
    {"transactionStart",primary["transactionStart"]},{"database","postgres"},{"user","postgres"},
    {"state","idle in transaction"},{"applicationName","jwg-finance-witness-"+match.Groups[2].Value}};
   if(mode=="reused-pid")row["backendPid"]=101;
  }else File.WriteAllText(Path.Combine(root,"primary.json"),serializer.Serialize(row));
  Console.WriteLine(serializer.Serialize(row));Console.Out.Flush();
  if(!observer){
   if(Console.In.ReadToEnd().Trim()!="rollback;")return 87;
   if(mode=="close-timeout"){Thread.Sleep(60000);return 88;}
   if(mode=="trailing-output")Console.WriteLine("UNEXPECTED");
   File.WriteAllText(Path.Combine(root,"primary-rollback.txt"),"received");
  }
  return 0;
 }
}
