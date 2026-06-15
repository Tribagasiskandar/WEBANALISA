$content = Get-Content -Raw -Path "sheet-logam-mulia.html"
$newArea = @"
                <!-- Chart Area: By Depo -->
                <div class="charts-grid-top" style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px;">
                    <div class="chart-card glass-panel">
                        <div class="card-header">
                            <h2>Pencapaian Berdasarkan Depo (Branch)</h2>
                        </div>
                        <div class="chart-container" style="height: 300px;">
                            <canvas id="depoChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-card glass-panel ai-insights">
                        <div class="card-header">
                            <h2>AI Insights</h2>
                        </div>
                        <div class="insights-container" style="margin-top: 16px;">
                            <div class="insight-box alert-box" style="padding: 12px; background: rgba(112, 71, 235, 0.1); border-left: 3px solid var(--accent-purple); margin-bottom: 12px;">
                                <h3 style="font-size: 14px; margin-bottom: 4px; color: var(--accent-purple);">Analisa Depo Teratas</h3>
                                <p id="ai-insight-logam" style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">Memuat data analisa...</p>
                            </div>
                        </div>
                    </div>
                </div>
"@
$content = $content -replace '(?s)<!-- Chart Area: By Depo -->.*?</div>\s*</div>\s*<!-- DataTables Area -->', "$newArea`r`n                <!-- DataTables Area -->"
Set-Content -Path "sheet-logam-mulia.html" -Value $content -Encoding UTF8
Write-Output "Berhasil inject AI Insight ke Logam Mulia"
