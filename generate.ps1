$html = Get-Content -Raw -Path index.html

$regex = "(?s)<div class=""dashboard-content"">.*?(?=\s*</main>)"

$pages = @(
    @("sheet-logam-mulia.html", "Sheet Logam Mulia"),
    @("top-items.html", "Top Items"),
    @("monitoring.html", "Monitoring"),
    @("ngvo.html", "NGVO"),
    @("dsms.html", "DSMS"),
    @("user-quality.html", "User Quality"),
    @("optimization.html", "Optimization"),
    @("reports-analytics.html", "Reports & Analytics"),
    @("ai-advisor.html", "AI Advisor"),
    @("prompt-builder.html", "Prompt Builder"),
    @("prompt-library.html", "Prompt Library"),
    @("integrations.html", "Integrations"),
    @("settings.html", "Settings")
)

foreach ($page in $pages) {
    $file = $page[0]
    $title = $page[1]
    
    $newContent = $html -replace $regex, "<div class=""dashboard-content""><h2 style=""color:var(--text-main)"">$title</h2><p style=""color:var(--text-muted); margin-top:10px"">Halaman ini sedang dalam tahap pengembangan.</p></div>"
    
    # move active class
    $newContent = $newContent -replace 'class="nav-item active"', 'class="nav-item"'
    $newContent = $newContent -replace "href=""$file"" class=""nav-item""", "href=""$file"" class=""nav-item active"""
    
    # remove the script tag and loading overlay since they are for index
    $newContent = $newContent -replace '(?s)<!-- Loading Overlay -->.*?</div>', ''
    $newContent = $newContent -replace '<script src="script.js"></script>', ''
    
    Set-Content -Path $file -Value $newContent -Encoding UTF8
}

Write-Output "Berhasil membuat 13 halaman baru!"
