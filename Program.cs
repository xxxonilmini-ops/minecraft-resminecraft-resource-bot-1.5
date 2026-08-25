using System.Diagnostics;

var projectDirectory = Directory.GetCurrentDirectory();
var nodeScript = Path.Combine(projectDirectory, "index.js");

if (!File.Exists(nodeScript))
{
    Console.Error.WriteLine($"index.js not found: {nodeScript}");
    return 1;
}

using var botProcess = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = "node",
        Arguments = "index.js",
        WorkingDirectory = projectDirectory,
        UseShellExecute = false,
        RedirectStandardInput = true,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = false,
    },
};

botProcess.OutputDataReceived += (_, args) =>
{
    if (args.Data is not null) Console.WriteLine($"[bot] {args.Data}");
};
botProcess.ErrorDataReceived += (_, args) =>
{
    if (args.Data is not null) Console.Error.WriteLine($"[bot error] {args.Data}");
};

try
{
    botProcess.Start();
    botProcess.BeginOutputReadLine();
    botProcess.BeginErrorReadLine();
}
catch (Exception error)
{
    Console.Error.WriteLine($"Could not start Node.js: {error.Message}");
    return 1;
}

Console.WriteLine("Minecraft bot console");
Console.WriteLine("Commands: Game:Дабить <блок> <сколько>, Вкл/Викл, prind, sort, status, stop, exit");

while (!botProcess.HasExited)
{
    Console.Write("> ");
    var command = Console.ReadLine();
    if (command is null || command.Equals("exit", StringComparison.OrdinalIgnoreCase)) break;
    if (string.IsNullOrWhiteSpace(command)) continue;

    await botProcess.StandardInput.WriteLineAsync(command);
    await botProcess.StandardInput.FlushAsync();
}

if (!botProcess.HasExited)
{
    await botProcess.StandardInput.WriteLineAsync("stop");
    await botProcess.StandardInput.FlushAsync();
    botProcess.Kill(entireProcessTree: true);
}

return 0;
