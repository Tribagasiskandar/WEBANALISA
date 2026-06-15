const RWO_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=1074980959&single=true&output=csv";
const LOGAM_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=40823443&single=true&output=csv";
const NGVO_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=1571139371&single=true&output=csv";
const DSMS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=223834562&single=true&output=csv";

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

function formatIndoMoney(num) {
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) {
        let val = (num / 1000000000).toFixed(1);
        return val.replace('.', ',') + " M";
    }
    if (absNum >= 1000000) {
        let val = (num / 1000000).toFixed(0);
        return val + " Jt";
    }
    if (absNum >= 1000) {
        let val = (num / 1000).toFixed(0);
        return val + " Rb";
    }
    return num.toLocaleString('id-ID');
}

function formatCurrency(num) {
    return "Rp " + formatIndoMoney(num);
}

Chart.defaults.color = '#8f8f9d';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

document.addEventListener('DOMContentLoaded', () => {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    Promise.all([
        fetch(DSMS_URL).then(res => res.text()),
        fetch(NGVO_URL).then(res => res.text()),
        fetch(RWO_URL).then(res => res.text())
    ]).then(csvTexts => {
        let [dsmsCsv, ngvoCsv, rwoCsv] = csvTexts;
        
        // Parse DSMS (Target, Real, %ACH)
        let totalTarget = 0;
        let totalReal = 0;
        let dsmsSalesData = {};
        
        Papa.parse(dsmsCsv, {
            header: true, skipEmptyLines: true,
            complete: function(res) {
                res.data.filter(r => r['SE']).forEach(row => {
                    let tgt = parseIDR(row['TARGET']);
                    let real = parseIDR(row['REAL']);
                    totalTarget += tgt;
                    totalReal += real;
                    
                    let se = row['SE'].trim();
                    if(!dsmsSalesData[se]) dsmsSalesData[se] = 0;
                    dsmsSalesData[se] += real;
                });
            }
        });

        // Parse NGVO (Total Active Customers)
        let totalToko = 0;
        Papa.parse(ngvoCsv, {
            header: true, skipEmptyLines: true,
            complete: function(res) {
                totalToko = res.data.filter(r => r['NAMA TOKO'] && r['NAMA TOKO'].trim() !== "").length;
            }
        });
        
        // Parse RWO (Est Insentif)
        let rwoIncentive = 0;
        Papa.parse(rwoCsv, {
            header: false, skipEmptyLines: true,
            complete: function(res) {
                if(res.data.length > 1) {
                    res.data.slice(1).forEach(row => {
                        let inc = parseIDR(row[28]); // Index for EST INSENTIF
                        rwoIncentive += inc;
                    });
                }
            }
        });

        // Update UI
        document.getElementById('val-customers').textContent = totalToko.toLocaleString('id-ID');
        document.getElementById('val-target').textContent = formatIndoMoney(totalTarget);
        document.getElementById('val-realization').textContent = formatIndoMoney(totalReal);
        
        let ach = totalTarget > 0 ? ((totalReal / totalTarget) * 100).toFixed(1) : 0;
        document.getElementById('val-percent-tgt').innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> ${ach}% ACH`;
        document.getElementById('val-percent-tgt').className = "stat-trend positive";
        
        document.getElementById('val-incentive').textContent = formatCurrency(rwoIncentive);
        
        document.getElementById('ai-insight-alert').innerHTML = `Terdapat <strong>${totalToko} Toko Aktif</strong> dengan pencapaian realisasi keseluruhan di angka <strong>${formatIndoMoney(totalReal)}</strong>. Tim harus mengejar sisa target untuk mencapai 100% ACH.`;
        document.getElementById('ai-insight-opt').innerHTML = `Fokuskan penawaran pada area prioritas NGVO dan genjot realisasi RWO untuk memaksimalkan potensi Insentif sebesar <strong>${formatCurrency(rwoIncentive)}</strong>.`;

        drawRevenueChart(dsmsSalesData);
        drawRetentionChart();

        document.getElementById('loading-overlay').classList.add('hidden');

    }).catch(err => {
        console.error("Dashboard Fetch Error:", err);
        document.getElementById('loading-overlay').innerHTML = `
            <div style="text-align: center; color: #ef4444;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 40px; margin-bottom: 16px;"></i>
                <p>Failed to load data from Google Sheets.</p>
                <p style="font-size: 12px; margin-top: 8px;">Please check your internet connection.</p>
            </div>
        `;
    });
});

function drawRevenueChart(dsmsSalesData) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    let seNames = Object.keys(dsmsSalesData);
    seNames.sort((a, b) => dsmsSalesData[b] - dsmsSalesData[a]);
    let topSE = seNames.slice(0, 10);
    let dataReal = topSE.map(se => dsmsSalesData[se]);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topSE,
            datasets: [{
                label: 'Realisasi DSMS',
                data: dataReal,
                backgroundColor: '#7047eb',
                borderColor: '#5d35d3',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function(context) { return formatIndoMoney(context.raw); } } }
            },
            scales: {
                y: { beginAtZero: true, border: { display: false }, ticks: { callback: function(value) { return formatIndoMoney(value); } } },
                x: { grid: { display: false } }
            }
        }
    });
}

function drawRetentionChart() {
    const ctx = document.getElementById('retentionChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['On Track', 'Off Track', 'At Risk'],
            datasets: [{
                data: [65, 20, 15],
                backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8f8f9d', padding: 20, font: { size: 12 } } }
            }
        }
    });
}
