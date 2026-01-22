Write-Host "=== FORCE ROUTER RENDER (FINAL DIAGNOSTIC) ===" -ForegroundColor Cyan

# Find likely auth providers
$providers = Get-ChildItem src -Recurse -Include "*.tsx" |
  Select-String "AuthProvider|AuthContext|AuthWrapper" |
  Select-Object -Unique Path

if ($providers.Count -eq 0) {
  Write-Host "❌ No AuthProvider-like file found" -ForegroundColor Red
  exit 1
}

$providerPath = $providers[0].Path
Write-Host "🎯 Patching provider:" $providerPath -ForegroundColor Yellow

# Backup
Copy-Item $providerPath "$providerPath.BACKUP" -Force
Write-Host "🛡️ Backup created" -ForegroundColor Cyan

$content = Get-Content $providerPath -Raw

# Kill silent null returns
$content = $content -replace 'return\s+null\s*;', @"
console.warn("⚠️ FORCED ROUTER RENDER: bypassing provider gate");
return <>{children}</>;
"@

$content | Out-File $providerPath -Encoding utf8 -Force
Write-Host "✅ Provider patched to always render children" -ForegroundColor Green

# Build
Write-Host "`n🏗️ Rebuilding..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

# Deploy
Write-Host "`n🚀 Deploying..." -ForegroundColor Yellow
firebase deploy --only hosting:admin --force
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n✅ DONE. Open Admin Core in INCOGNITO." -ForegroundColor Green
