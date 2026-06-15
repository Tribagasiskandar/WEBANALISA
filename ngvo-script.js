const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=1571139371&single=true&output=csv";

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

function formatCurrency(num) {
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) return "Rp " + (num / 1000000000).toFixed(1) + "B";
    if (absNum >= 1000000) return "Rp " + (num / 1000000).toFixed(1) + "M";
    if (absNum >= 1000) return "Rp " + (num / 1000).toFixed(1) + "K";
    return "Rp " + num.toFixed(0);
}

function formatFullCurrency(num) {
    return "Rp " + Math.round(num).toLocaleString('id-ID');
}

Chart.defaults.color = '#8f8f9d';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

let ngvoChartInstance = null;

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
                processNgvoData(results.data);
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

function processNgvoData(data) {
    let totalToko = 0;
    let totalTransaksiAll = 0;
    let countPrioritas = 0;
    
    let priorityStores = [];
    let tableRows = [];
    
    let validData = data.filter(row => row['NAMA TOKO'] && row['NAMA TOKO'].trim() !== "");
    
    const excludeKeys = ['REGION NAME', 'ENTITY NAME', 'AREA', 'CUST CODE', 'KODE SALES', 'NAMA TOKO', 'ALAMAT', 'MAX NOV -DES 25'];
    
    validData.forEach(row => {
        let tokoTransaksiTotal = 0;
        
        Object.keys(row).forEach(key => {
            if (!excludeKeys.includes(key) && key.includes('-')) {
                tokoTransaksiTotal += parseIDR(row[key]);
            }
        });
        
        totalToko++;
        totalTransaksiAll += tokoTransaksiTotal;
        
        let isPriority = false;
        if (tokoTransaksiTotal >= 1500000 && tokoTransaksiTotal <= 3000000) {
            isPriority = true;
            countPrioritas++;
            priorityStores.push({
                name: row['NAMA TOKO'],
                val: tokoTransaksiTotal
            });
        }
        
        let status = isPriority 
            ? '<span class="stat-trend positive" style="padding:4px 8px;border-radius:12px;background:var(--accent-purple-hover);color:white;">Prioritas</span>'
            : '<span style="color:var(--text-muted)">Reguler</span>';
            
        tableRows.push([
            row['NAMA TOKO'],
            row['AREA'] || '-',
            row['KODE SALES'] || '-',
            formatFullCurrency(tokoTransaksiTotal),
            status
        ]);
    });
    
    document.getElementById('ngvo-toko').textContent = formatNumberPlain(totalToko);
    document.getElementById('ngvo-trans').textContent = formatCurrency(totalTransaksiAll);
    document.getElementById('ngvo-prioritas').textContent = formatNumberPlain(countPrioritas) + ' Toko';
    
    let insightEl = document.getElementById('ai-insight-ngvo');
    if (insightEl) {
        let pct = totalToko > 0 ? ((countPrioritas / totalToko) * 100).toFixed(1) : 0;
        insightEl.innerHTML = `Data intelijen menemukan <strong>${countPrioritas} Toko (${pct}%)</strong> dalam status "Prioritas Tinggi" dengan rata-rata akumulasi transaksi di kisaran 1.5 - 3 Juta. Segera tugaskan tim Sales untuk memfokuskan kunjungan ke toko-toko ini. Peningkatan sedikit saja dari mereka akan memberi dampak signifikan bagi total Revenue NGVO Anda.`;
    }
    
    drawChart(priorityStores);
    
    $('#dataTable').DataTable({
        data: tableRows,
        pageLength: 10,
        responsive: true,
        order: [[3, 'desc']] // Sort by Transaksi
    });
    
    document.getElementById('loading-overlay').classList.add('hidden');
}

function formatNumberPlain(num) {
    return num.toLocaleString('id-ID');
}

function drawChart(stores) {
    stores.sort((a, b) => b.val - a.val);
    let topStores = stores.slice(0, 10);
    
    let labels = topStores.map(s => s.name.substring(0, 20) + (s.name.length > 20 ? '...' : ''));
    let data = topStores.map(s => s.val);
    
    const ctx = document.getElementById('ngvoChart').getContext('2d');
    
    ngvoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Transaksi',
                data: data,
                backgroundColor: '#7047eb',
                borderColor: '#5d35d3',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) { return formatCurrency(context.raw); }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: function(value) { return formatCurrency(value); } }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}
