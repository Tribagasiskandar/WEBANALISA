$template = Get-Content -Raw -Path "sheet-logam-mulia.html"

$pages = @(
    @("top-items.html", "Top Items"),
    @("monitoring.html", "Monitoring"),
    @("ngvo.html", "NGVO"),
    @("dsms.html", "DSMS"),
    @("rwo.html", "RWO")
)

foreach ($page in $pages) {
    $file = $page[0]
    $title = $page[1]
    
    $content = $template
    
    # 1. Remove active from Logam Mulia
    $content = $content -replace '<a href="sheet-logam-mulia.html" class="nav-item active">', '<a href="sheet-logam-mulia.html" class="nav-item">'
    
    # 2. Add active to the target page
    $content = $content -replace "<a href=""$file"" class=""nav-item"">", "<a href=""$file"" class=""nav-item active"">"
    
    # 3. Change H1 title
    $content = $content -replace '<h1>Detail Report: Logam Mulia</h1>', "<h1>Detail Report: $title</h1>"
    
    Set-Content -Path $file -Value $content -Encoding UTF8
}

Write-Output "Berhasil menduplikasi layout detail ke 5 menu lainnya"
