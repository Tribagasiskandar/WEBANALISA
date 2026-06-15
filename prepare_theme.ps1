$htmlFiles = Get-ChildItem -Filter *.html
foreach ($file in $htmlFiles) {
    $content = Get-Content -Raw -Path $file.FullName
    $content = $content -replace '<button class="icon-btn"><i class="fa-solid fa-moon"></i></button>', '<button class="icon-btn" id="theme-toggle"><i class="fa-solid fa-moon"></i></button>'
    
    if ($content -notmatch 'theme.js') {
        $content = $content -replace '</body>', "`r`n    <script src=`"theme.js`"></script>`r`n</body>"
    }
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}
Write-Output "Berhasil menyiapkan theme toggle di semua HTML"
