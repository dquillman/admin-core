$ErrorActionPreference = "Stop"

$path = "src/config.ts"

if (-not (Test-Path $path)) {
    throw "File not found: $path"
}

$content = Get-Content $path -Raw

$old = "export const ADMIN_CORE_VERSION = '1.14.1';"
$new = "export const ADMIN_CORE_VERSION = '1.14.2';"

if ($content -notlike "*$old*") {
    throw "Expected version constant not found. Aborting."
}

$content = $content -replace [regex]::Escape($old), $new

Set-Content -Path $path -Value $content -Encoding utf8

Write-Host "✅ ADMIN_CORE_VERSION bumped to 1.14.2"

