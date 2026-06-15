const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=223834562&single=true&output=csv";

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

function formatNumber(num) {
    return num.toLocaleString('id-ID');
}

Chart.defaults.color = '#8f8f9d';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

let dsmsChartInstance = null;

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
                processDsmsData(results.data);
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

function processDsmsData(data) {
    let salesData = {};
    let tableRows = [];
    
    let grandTarget = 0;
    let grandReal = 0;
    let grandRo = 0;
    let grandPareto = 0;
    
    let validData = data.filter(row => row['SE'] && row['SE'].trim() !== "");
    
    validData.forEach(row => {
        let se = row['SE'].trim();
        if (!salesData[se]) {
            salesData[se] = {
                target: 0, real: 0, ro: 0, pareto: 0, geotag: 0, 
                pc: 0, ac: 0, pc_ac: 0, ec1: 0, ec2: 0, noo: 0, ipt: 0, count: 0
            };
        }
        
        let target = parseIDR(row['TARGET']);
        let real = parseIDR(row['REAL']);
        
        // Handling blanks specifically
        let rawRo = row['RO'] || row['RO '] || row['"RO\n "'] || "";
        let rawPareto = row['PARETO'] || "";
        let rawGeotag = row['GEOTAG'] || row['GEOTAG '] || row['"GEOTAG\n "'] || "";
        let rawPc = row['PC'] || "";
        let rawAc = row['AC'] || "";
        
        let ro = parseIDR(rawRo);
        let pareto = parseIDR(rawPareto);
        let geotag = parseIDR(rawGeotag);
        let pc = parseIDR(rawPc);
        let ac = parseIDR(rawAc);
        
        let pc_ac = row['PC = AC'] || row['"PC = AC\n "'] || "";
        let ec = row['EC'] || "";
        let noo = row['NOO'] || row['"NOO\n "'] || "";
        let ipt = row['IPT'] || "";
        
        salesData[se].target += target;
        salesData[se].real += real;
        salesData[se].ro += ro;
        salesData[se].pareto += pareto;
        salesData[se].geotag += geotag;
        salesData[se].pc += pc;
        salesData[se].ac += ac;
        
        grandTarget += target;
        grandReal += real;
        grandRo += ro;
        grandPareto += pareto;
        
        let ach = target > 0 ? ((real / target) * 100).toFixed(1) + '%' : '0%';
        let pctPareto = ro > 0 ? ((pareto / ro) * 100).toFixed(1) + '%' : '0%';
        let pctGeotag = ro > 0 ? ((geotag / ro) * 100).toFixed(1) + '%' : '0%';
        
        tableRows.push([
            se,
            formatIndoMoney(target),
            formatIndoMoney(real),
            ach,
            rawRo.trim() === "" ? "-" : formatNumber(ro),
            rawPareto.trim() === "" ? "-" : formatNumber(pareto),
            pctPareto,
            rawGeotag.trim() === "" ? "-" : formatNumber(geotag),
            pctGeotag,
            rawPc.trim() === "" ? "-" : formatNumber(pc),
            rawAc.trim() === "" ? "-" : formatNumber(ac),
            pc_ac.trim() === "" ? "-" : pc_ac,
            ec.trim() === "" ? "-" : ec,
            noo.trim() === "" ? "-" : noo,
            ipt.trim() === "" ? "-" : ipt
        ]);
    });
    
    document.getElementById('dsms-target').textContent = formatIndoMoney(grandTarget);
    document.getElementById('dsms-real').textContent = formatIndoMoney(grandReal);
    document.getElementById('dsms-ro').textContent = formatNumber(grandRo);
    document.getElementById('dsms-pareto').textContent = formatNumber(grandPareto);
    
    let totalAch = grandTarget > 0 ? ((grandReal / grandTarget) * 100).toFixed(1) : 0;
    document.getElementById('dsms-ach').innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> ${totalAch}% ACH`;
    
    drawChart(salesData);
    
    let seNames = Object.keys(salesData);
    seNames.sort((a, b) => salesData[b].real - salesData[a].real);
    
    let insightEl = document.getElementById('ai-insight-top-se');
    if (insightEl) {
        if (seNames.length > 0) {
            let topSE = seNames[0];
            let sd = salesData[topSE];
            let paretoPct = sd.ro > 0 ? ((sd.pareto / sd.ro) * 100).toFixed(1) : 0;
            insightEl.innerHTML = `Analisis algoritma menetapkan <strong>${topSE}</strong> sebagai ujung tombak utama. Ia menyumbang Realisasi tertinggi <strong>(${formatIndoMoney(sd.real)})</strong> dengan rasio Pareto sehat di angka <strong>${paretoPct}%</strong>. Berikan insentif lebih atau jadikan metode penjualannya sebagai <em>benchmark</em> bagi armada SE yang lain untuk mendongkrak performa kolektif.`;
        } else {
            insightEl.innerHTML = `Belum ada data salesman yang dapat dianalisa.`;
        }
    }
    
    $('#dataTable').DataTable({
        data: tableRows,
        pageLength: 10,
        responsive: true,
        order: [[2, 'desc']] // Sort by Real
    });
    
    document.getElementById('loading-overlay').classList.add('hidden');
}

function drawChart(salesData) {
    let seNames = Object.keys(salesData);
    seNames.sort((a, b) => salesData[b].real - salesData[a].real);
    
    let labels = seNames.slice(0, 10);
    let targets = labels.map(se => salesData[se].target);
    let reals = labels.map(se => salesData[se].real);
    
    const ctx = document.getElementById('dsmsChart').getContext('2d');
    
    if (dsmsChartInstance) {
        dsmsChartInstance.destroy();
    }
    
    dsmsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Target',
                    data: targets,
                    backgroundColor: 'rgba(74, 74, 90, 0.5)',
                    borderColor: 'rgba(74, 74, 90, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Realisasi',
                    data: reals,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1,
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
                    callbacks: { label: function(context) { return context.dataset.label + ': ' + formatIndoMoney(context.raw); } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: function(value) { return formatIndoMoney(value); } }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}
