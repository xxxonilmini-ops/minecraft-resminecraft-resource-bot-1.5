$serverDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverJar = Join-Path $serverDirectory 'server-1.16.5.jar'
$url = 'https://piston-data.mojang.com/v1/objects/1b557e7b033b583cd9f66746b7a9ab1ec1673ced/server.jar'

Invoke-WebRequest -Uri $url -OutFile $serverJar
Write-Host "Downloaded Minecraft 1.16.5 server to $serverJar"
