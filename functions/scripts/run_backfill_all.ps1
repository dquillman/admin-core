# ============================
# Backfill Runner (All Projects)
# ============================

$projects = @(
    "exam-coach-ai-platform",
    "exam-coach-ai-platform-staging"
)

foreach ($project in $projects) {

    Write-Host ""
    Write-Host "======================================"
    Write-Host "Switching to project: $project"
    Write-Host "======================================"

    firebase use $project

    Write-Host "Running backfill..."
    node backfill_usage_scores.js

    Write-Host "--------------------------------------"
}

Write-Host ""
Write-Host "DONE."
