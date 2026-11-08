// Synthetic test process only: no database libraries or network operations.
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
public static class FinanceLaunchInert {
  public static int Main(string[] args) {
    byte[] bytes;
    using (var input = new MemoryStream()) { Console.OpenStandardInput().CopyTo(input); bytes = input.ToArray(); }
    foreach (var arg in args) Console.WriteLine("ARG=" + arg);
    foreach (string key in Environment.GetEnvironmentVariables().Keys) {
      var upper = key.ToUpperInvariant();
      if (upper.StartsWith("PG") || upper == "NODE_OPTIONS" || upper == "SUPABASE_SECRET_KEY")
        Console.WriteLine("ENV=" + key + "=" + Environment.GetEnvironmentVariable(key));
    }
    using (var sha = SHA256.Create()) Console.WriteLine("INPUT=" + BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant());
    return 0;
  }
}
