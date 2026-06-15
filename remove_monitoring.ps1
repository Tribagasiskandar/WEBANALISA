Remove-Item -Path "monitoring.html" -ErrorAction SilentlyContinue
$htmlFiles = Get-ChildItem -Filter *.html
foreach ($file in $htmlFiles) {
    $content = Get-Content -Raw -Path $file.FullName
    # Regex to remove the monitoring.html nav block
    $content = $content -replace '(?s)\s*<a href="monitoring\.html".*?</a>\s*', "`r`n                "
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}
Write-Output "Berhasil menghapus monitoring.html dan menghapus link dari sidebar"
