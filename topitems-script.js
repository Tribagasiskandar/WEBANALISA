const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=1434625080&single=true&output=csv";

function parseIDR(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    let val = str.toString().trim();
    if (val === '-' || val === '') return 0;
    
    let isNegative = false;
    if (val.startsWith('(') && val.endsWith(')')) {
        isNegative = true;
        val = val.substring(1, val.length - 1);
    }
    
    val = val.replace(/\s/g, '');
    let lastComma = val.lastIndexOf(',');
    let lastDot = val.lastIndexOf('.');
    
    if (lastComma > lastDot) {
        val = val.replace(/\./g, '');
        val = val.replace(/,/g, '.');
    } else if (lastDot > lastComma) {
        let dotCount = (val.match(/\./g) || []).length;
        if (dotCount > 1 && lastComma === -1) {
            val = val.replace(/\./g, '');
        } else {
            val = val.replace(/,/g, '');
        }
    }
    
    let num = parseFloat(val);
    if(isNaN(num)) return 0;
    return isNegative ? -num : num;
}

function formatNumber(num) {
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) return (num / 1000000000).toFixed(1) + "B";
    if (absNum >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (absNum >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString('id-ID');
}

Chart.defaults.color = '#8f8f9d';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

let topItemsChartInstance = null;
let roAoChartInstance = null;

fetch(sheetURL)
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
    })
    .then(csvText => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                processTopItemsData(results.data);
            },
            error: function(err) {
                console.error("Error parsing CSV:", err);
                showError();
            }
        });
    })
    .catch(error => {
        console.error("Error fetching CSV:", error);
        showError();
    });

function showError() {
    document.getElementById('loading-overlay').innerHTML = `
        <div style="text-align: center; color: #ef4444;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 40px; margin-bottom: 16px;"></i>
            <p>Failed to load data from Google Sheets.</p>
        </div>
    `;
}

function processTopItemsData(data) {
    let totalReal = 0;
    let totalLalu = 0;
    let totalRO = 0;
    let totalAO = 0;
    
    let products = {};
    let tableRows = [];
    
    // EXCLUDE AO ALL as requested
    let validData = data.filter(row => row['TopItems'] && row['TopItems'].trim() !== "" && row['TopItems'].trim().toUpperCase() !== "AO ALL");
    
    validData.forEach(row => {
        let real = parseIDR(row['Real']);
        let lalu = parseIDR(row['Thn lalu']);
        let ro = parseIDR(row['RO']);
        let ao = parseIDR(row['AO']);
        
        totalReal += real;
        totalLalu += lalu;
        totalRO += ro;
        totalAO += ao;
        
        let productName = row['TopItems'].trim();
        if (!products[productName]) {
            products[productName] = { real: 0, ro: 0, ao: 0 };
        }
        products[productName].real += real;
        products[productName].ro += ro;
        products[productName].ao += ao;
        
        tableRows.push([
            row['NAMA SALEMAN'] || '-',
            productName,
            row['Bulan'] || '-',
            formatNumber(lalu),
            formatNumber(real),
            row['% Growth'] || '-',
            formatNumber(ro),
            formatNumber(ao)
        ]);
    });
    
    document.getElementById('top-real').textContent = formatNumber(totalReal);
    document.getElementById('top-lalu').textContent = formatNumber(totalLalu);
    document.getElementById('top-ro').textContent = formatNumber(totalRO);
    document.getElementById('top-ao').textContent = formatNumber(totalAO);
    
    let growthPct = totalLalu > 0 ? (((totalReal - totalLalu) / totalLalu) * 100).toFixed(1) : 0;
    let growthEl = document.getElementById('top-growth');
    if (growthPct >= 0) {
        growthEl.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${growthPct}% vs Tahun Lalu`;
        growthEl.className = 'stat-trend positive';
    } else {
        growthEl.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> ${growthPct}% vs Tahun Lalu`;
        growthEl.className = 'stat-trend negative';
    }
    
    drawChart(products);
    generateInsights(products, totalReal, totalLalu, growthPct);
    
    $('#dataTable').DataTable({
        data: tableRows,
        pageLength: 10,
        responsive: true,
        order: [[4, 'desc']] // Sort by Real
    });
    
    document.getElementById('loading-overlay').classList.add('hidden');
}

function drawChart(products) {
    let productNames = Object.keys(products);
    productNames.sort((a, b) => products[b].real - products[a].real);
    let topProducts = productNames.slice(0, 8);
    
    let dataReal = topProducts.map(p => products[p].real);
    let dataRo = topProducts.map(p => products[p].ro);
    let dataAo = topProducts.map(p => products[p].ao);
    
    // PIE CHART: Kontribusi Produk Terlaris (Real)
    const ctx1 = document.getElementById('topItemsChart').getContext('2d');
    if (topItemsChartInstance) topItemsChartInstance.destroy();
    
    topItemsChartInstance = new Chart(ctx1, {
        type: 'pie',
        data: {
            labels: topProducts,
            datasets: [{
                data: dataReal,
                backgroundColor: [
                    '#7047eb', '#2ed573', '#ff4757', '#ffa502',
                    '#1e90ff', '#ff7f50', '#a4b0be', '#3742fa'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#f0f0f5' } },
                tooltip: {
                    callbacks: {
                        label: function(context) { return context.label + ': ' + formatNumber(context.raw); }
                    }
                }
            }
        }
    });

    // BAR CHART: RO vs AO per Item
    const ctx2 = document.getElementById('roAoChart').getContext('2d');
    if (roAoChartInstance) roAoChartInstance.destroy();
    
    roAoChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: topProducts,
            datasets: [
                {
                    label: 'RO',
                    data: dataRo,
                    backgroundColor: '#1e90ff',
                    borderRadius: 4
                },
                {
                    label: 'AO',
                    data: dataAo,
                    backgroundColor: '#ff4757',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#f0f0f5' } },
                tooltip: {
                    callbacks: {
                        label: function(context) { return context.dataset.label + ': ' + formatNumber(context.raw); }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function generateInsights(products, totalReal, totalLalu, growthPct) {
    let productNames = Object.keys(products);
    productNames.sort((a, b) => products[b].real - products[a].real);
    
    if(productNames.length === 0) return;
    
    let topProduct = productNames[0];
    let topVal = products[topProduct].real;
    let pctContribution = totalReal > 0 ? ((topVal / totalReal) * 100).toFixed(1) : 0;
    
    document.getElementById('ai-insight-top').innerHTML = `Analisa mendalam menunjukkan bahwa Produk <strong>${topProduct}</strong> mendominasi penjualan, menyumbang <strong>${pctContribution}%</strong> dari total penjualan Real. Ini menunjukkan tingginya permintaan pasar yang harus dipertahankan.`;
    
    let growthText = "";
    if (growthPct > 0) {
        growthText = `Secara keseluruhan, bisnis Anda mencetak rekor pertumbuhan positif sebesar <strong>+${growthPct}%</strong> dibandingkan periode yang sama tahun lalu. Strategi promosi dan ketersediaan AO Anda bekerja dengan sangat optimal.`;
    } else {
        growthText = `Perhatian: Terdapat penurunan kinerja <strong>${growthPct}%</strong> dibanding tahun lalu. Segera koordinasikan dengan armada sales untuk mengaudit kembali efektivitas RO dan memastikan suplai Top Items tidak terhambat.`;
    }
    document.getElementById('ai-insight-growth').innerHTML = growthText;
}
