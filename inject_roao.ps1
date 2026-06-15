$content = Get-Content -Raw -Path "top-items.html"
$newCharts = @"
                    <!-- Chart Area: Kontribusi -->
                    <div class="chart-card glass-panel" style="margin-bottom: 24px;">
                        <div class="card-header">
                            <h2>Kontribusi Produk Terlaris (Top Items)</h2>
                        </div>
                        <div class="chart-container" style="height: 300px;">
                            <canvas id="topItemsChart"></canvas>
                        </div>
                    </div>

                    <!-- Chart Area: RO vs AO -->
                    <div class="chart-card glass-panel">
                        <div class="card-header">
                            <h2>Perbandingan RO & AO per Item</h2>
                        </div>
                        <div class="chart-container" style="height: 300px;">
                            <canvas id="roAoChart"></canvas>
                        </div>
                    </div>
"@
$content = $content -replace '(?s)<div class="chart-card glass-panel">\s*<div class="card-header">\s*<h2>Kontribusi Produk Terlaris \(Top Items\)</h2>\s*</div>\s*<div class="chart-container" style="height: 300px;">\s*<canvas id="topItemsChart"></canvas>\s*</div>\s*</div>', $newCharts
Set-Content -Path "top-items.html" -Value $content -Encoding UTF8
Write-Output "Berhasil menambahkan roAoChart ke top-items.html"
