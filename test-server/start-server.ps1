$serverDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverJar = Join-Path $serverDirectory 'server-1.16.5.jar'

if (-not (Test-Path -LiteralPath $serverJar)) {
    Write-Error "Missing server-1.16.5.jar. Run download-server.ps1 first."
    exit 1
}

$eulaFile = Join-Path $serverDirectory 'eula.txt'
$eulaAccepted = Select-String -LiteralPath $eulaFile -Pattern '^eula=true$' -Quiet
if (-not $eulaAccepted) {
    Write-Host 'Set eula=true in eula.txt after accepting the Minecraft EULA.'
    exit 1
}

Set-Location -LiteralPath $serverDirectory
& java -Xms1G -Xmx2G -jar $serverJar nogui
