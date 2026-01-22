Write-Host "=== DIAGNOSE FIREBASE HOSTING TARGET ===" -ForegroundColor Cyan

# Safety checks
if (!(Test-Path "firebase.json")) { Write-Host "❌ firebase.json not found. Run from repo root." -ForegroundColor Red; exit 1 }
if (!(Test-Path "package.json"))  { Write-Host "❌ package.json not found. Run from repo root." -ForegroundColor Red; exit 1 }

Write-Host "`n--- 1) Active Firebase project (firebase use) ---" -ForegroundColor Yellow
firebase use

Write-Host "`n--- 2) Firebase projects available (firebase projects:list) ---" -ForegroundColor Yellow
firebase projects:list

Write-Host "`n--- 3) Hosting targets mapped (firebase target:list) ---" -ForegroundColor Yellow
firebase target:list

Write-Host "`n--- 4) firebase.json hosting config ---" -ForegroundColor Yellow
$fj = Get-Content "firebase.json" -Raw | ConvertFrom-Json
$hosting = $fj.hosting

if ($hosting -is [System.Array]) {
  Write-Host "Hosting is an ARRAY (multi-site or multi-target)." -ForegroundColor Green
  $i = 0
  foreach ($h in $hosting) {
    Write-Host "`nHosting[$i]:" -ForegroundColor Cyan
    $h | ConvertTo-Json -Depth 10
    $i++
  }
} else {
  Write-Host "Hosting is a SINGLE object." -ForegroundColor Green
  $hosting | ConvertTo-Json -Depth 10
}

Write-Host "`n--- 5) Build integrity check: do referenced assets exist? ---" -ForegroundColor Yellow
if (!(Test-Path "dist/index.html")) {
  Write-Host "⚠️ dist/index.html not found. Run npm run build first." -ForegroundColor DarkYellow
} else {
  $html = Get-Content "dist/index.html" -Raw

  $refs = @()
  $refs += ([regex]::Matches($html, 'src="([^"]+assets/[^"]+\.js)"')  | ForEach-Object { $_.Groups[1].Value })
  $refs += ([regex]::Matches($html, 'href="([^"]+assets/[^"]+\.css)"')| ForEach-Object { $_.Groups[1].Value })
  $refs = $refs | Sort-Object -Unique

  if ($refs.Count -eq 0) {
    Write-Host "❌ No asset refs found in dist/index.html. Something is off in build output." -ForegroundColor Red
  } else {
    $missing = 0
    foreach ($r in $refs) {
      $p = $r -replace '^\/*',''  # remove leading slash
      $p = Join-Path "dist" $p
      if (!(Test-Path $p)) {
        Write-Host "❌ MISSING: $r  (expected: $p)" -ForegroundColor Red
        $missing++
      } else {
        Write-Host "✅ OK: $r" -ForegroundColor Green
      }
    }
    if ($missing -gt 0) {
      Write-Host "`n❌ Build output is inconsistent. Fix build before deploying." -ForegroundColor Red
    } else {
      Write-Host "`n✅ Build assets referenced by index.html exist locally." -ForegroundColor Green
    }
  }
}

Write-Host "`n=== NEXT: If deploy is wrong target, use deploy script below ===" -ForegroundColor Cyan
