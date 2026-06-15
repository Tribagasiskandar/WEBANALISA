$htmlFiles = Get-ChildItem -Filter *.html

$rwoMenu = @"
                <a href="rwo.html" class="nav-item">
                    <i class="fa-solid fa-layer-group"></i>
                    <span>RWO</span>
                </a>
"@

foreach ($file in $htmlFiles) {
    if ($file.Name -eq "rwo.html") { continue }
    
    $content = Get-Content -Raw -Path $file.FullName
    if ($content -notmatch 'href="rwo.html"') {
        # Regex to match the DSMS menu block and insert RWO after it
        $content = $content -replace '(?s)(<a href="dsms.html" class="nav-item(?: active)?">.*?</a>)', "`$1`r`n$rwoMenu"
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    }
}

# Generate rwo.html from dsms.html
$rwoContent = Get-Content -Raw -Path "dsms.html"
$rwoContent = $rwoContent -replace '<a href="dsms.html" class="nav-item active">', '<a href="dsms.html" class="nav-item">'
$rwoContent = $rwoContent -replace '<a href="rwo.html" class="nav-item">', '<a href="rwo.html" class="nav-item active">'
$rwoContent = $rwoContent -replace '<h2 style="color:var\(--text-main\)">DSMS</h2>', '<h2 style="color:var(--text-main)">RWO</h2>'
Set-Content -Path "rwo.html" -Value $rwoContent -Encoding UTF8
Write-Output "Berhasil menambahkan RWO"
