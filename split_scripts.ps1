$scripts = @(
    @("logam-script.js", "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=40823443&single=true&output=csv", "sheet-logam-mulia.html"),
    @("topitems-script.js", "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=1434625080&single=true&output=csv", "top-items.html"),
    @("ngvo-script.js", "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=1571139371&single=true&output=csv", "ngvo.html"),
    @("dsms-script.js", "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=223834562&single=true&output=csv", "dsms.html")
)

$templateJS = Get-Content -Raw -Path "detail-script.js"

foreach ($item in $scripts) {
    $jsName = $item[0]
    $url = $item[1]
    $htmlName = $item[2]
    
    # Create JS file
    $newJS = $templateJS -replace 'const sheetURL = ".*?";', "const sheetURL = `"$url`";"
    Set-Content -Path $jsName -Value $newJS -Encoding UTF8
    
    # Update HTML file to point to new JS
    $htmlContent = Get-Content -Raw -Path $htmlName
    $htmlContent = $htmlContent -replace '<script src="detail-script.js"></script>', "<script src=`"$jsName`"></script>"
    Set-Content -Path $htmlName -Value $htmlContent -Encoding UTF8
}
Write-Output "Berhasil memisahkan script JS!"
