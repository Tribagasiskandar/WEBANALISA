$htmlFiles = Get-ChildItem -Filter *.html
foreach ($file in $htmlFiles) {
    $content = Get-Content -Raw -Path $file.FullName
    $content = $content -replace '>Sheet Logam Mulia</span>', '>Logam Mulia</span>'
    $content = $content -replace 'Sheet Logam Mulia</h2>', 'Logam Mulia</h2>'
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}
Write-Output "Renamed Sheet Logam Mulia"
