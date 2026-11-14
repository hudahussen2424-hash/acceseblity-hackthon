param(
  [string]$Url = "http://localhost:8000/demo/blank.html",
  [string]$ReportPath = "$env:TEMP/db-assistant-lighthouse.json"
)

npx --yes lighthouse $Url `
  --chrome-flags="--headless=new" `
  --throttling-method=simulate `
  --throttling.rttMs=400 `
  --throttling.throughputKbps=400 `
  --throttling.cpuSlowdownMultiplier=4 `
  --output=json `
  --output-path=$ReportPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$report = Get-Content -LiteralPath $ReportPath -Raw | ConvertFrom-Json
$metrics = $report.audits.metrics.details.items[0]
[pscustomobject]@{
  Url = $report.finalDisplayedUrl
  ObservedLoadMs = [math]::Round($metrics.observedLoad)
  FirstContentfulPaintMs = [math]::Round($metrics.observedFirstContentfulPaint)
  LighthousePerformance = $report.categories.performance.score
}
