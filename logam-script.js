const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=40823443&single=true&output=csv";

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

function formatNumberKarton(num) {
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) return (num / 1000000000).toFixed(1) + "B Karton";
    if (absNum >= 1000000) return (num / 1000000).toFixed(1) + "M Karton";
    if (absNum >= 1000) return (num / 1000).toFixed(1) + "K Karton";
    return num.toFixed(0) + " Karton";
}

function formatFullKarton(num) {
    return Math.round(num).toLocaleString('id-ID') + " Karton";
}

function getStatusBadge(status) {
    let s = (status || "").toUpperCase();
    if (s.includes('ON TRACK')) return `<span class="stat-trend positive" style="padding:4px 8px;border-radius:12px;background:var(--positive-bg);color:var(--positive); white-space:nowrap;">On Track</span>`;
    if (s.includes('OFF TRACK')) return `<span class="stat-trend negative" style="padding:4px 8px;border-radius:12px;background:var(--negative-bg);color:var(--negative); white-space:nowrap;">Off Track</span>`;
    return `<span style="white-space:nowrap;">${status || '-'}</span>`;
}

Chart.defaults.color = '#8f8f9d';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

let depoChartInstance = null;
let logamDataTable = null;
let rawData = [];

fetch(sheetURL)
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
    })
    .then(csvText => {
        Papa.parse(csvText, {
            header: false,
            skipEmptyLines: true,
            complete: function(results) {
                if(results.data.length > 0) {
                    rawData = results.data.slice(1).filter(row => row[4] && row[4].trim() !== ""); // row[4] is CustomerName
                    initFilter();
                    processDetailData("ALL", "ALL");
                }
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

function initFilter() {
    const paketanFilter = document.getElementById('paketanFilter');
    const trackFilter = document.getElementById('trackFilter');
    const uniquePaket = new Set();
    
    rawData.forEach(row => {
        const paket = (row[26] || "").trim(); // Paketan
        if (paket) uniquePaket.add(paket);
    });
    
    Array.from(uniquePaket).sort().forEach(paket => {
        const option = document.createElement('option');
        option.value = paket;
        option.textContent = paket;
        paketanFilter.appendChild(option);
    });
    
    const triggerFilter = () => {
        processDetailData(paketanFilter.value, trackFilter.value);
    };
    
    paketanFilter.addEventListener('change', triggerFilter);
    trackFilter.addEventListener('change', triggerFilter);
}

function processDetailData(paketanFilter, trackFilter) {
    let filteredData = rawData;
    
    if (paketanFilter !== "ALL") {
        filteredData = filteredData.filter(row => (row[26] || "").trim() === paketanFilter);
    }
    
    if (trackFilter !== "ALL") {
        filteredData = filteredData.filter(row => {
            let s1 = (row[13] || "").toUpperCase(); // Ket Bln 1
            let s2 = (row[16] || "").toUpperCase(); // Ket Bln 2
            let s3 = (row[19] || "").toUpperCase(); // Ket Bln 3
            let sf = (row[25] || "").toUpperCase(); // Ket Final
            
            if (trackFilter === "BLN1") return s1.includes('ON TRACK');
            if (trackFilter === "BLN2") return s2.includes('ON TRACK');
            if (trackFilter === "BLN3") return s3.includes('ON TRACK');
            if (trackFilter === "FINAL") return sf.includes('ON TRACK');
            return true;
        });
    }

    let totalTarget = 0;
    let totalRealisasi = 0;
    let totalIncentive = 0;
    let branches = {};
    let tableRows = [];
    
    filteredData.forEach(row => {
        let t1 = parseIDR(row[8]);
        let t2 = parseIDR(row[9]);
        let target3 = parseIDR(row[10]);
        let r1 = parseIDR(row[11]);
        let r2 = parseIDR(row[14]);
        let r3 = parseIDR(row[17]);
        
        let incentive = parseIDR(row[27]); // EstPencapaianReward
        
        let realization = r1 + r2 + r3;
        
        totalTarget += target3; // Target Total is usually Target3
        totalRealisasi += realization;
        totalIncentive += incentive;
        
        let branch = row[2] || 'Unknown';
        if (!branches[branch]) {
            branches[branch] = { target: 0, realization: 0 };
        }
        branches[branch].target += target3;
        branches[branch].realization += realization;
        
        tableRows.push([
            row[0] || '-', // REGION
            row[1] || '-', // EntityName
            row[2] || '-', // BranchName
            row[3] || '-', // CustomerId
            row[4] || '-', // CustomerName
            row[5] || '-', // Address
            row[6] || '-', // PhoneNumber
            row[7] || '-', // Lalg
            formatFullKarton(t1), // Target 1
            formatFullKarton(t2), // Target 2 (was typo Target1)
            formatFullKarton(target3), // Target 3
            formatFullKarton(r1), // Real 1
            row[12] || '-', // % Tgt 1
            getStatusBadge(row[13]), // Ket 1
            formatFullKarton(r2), // Real 2
            row[15] || '-', // % Tgt 2
            getStatusBadge(row[16]), // Ket 2
            formatFullKarton(r3), // Real 3
            row[18] || '-', // % Tgt 3
            getStatusBadge(row[19]), // Ket 3
            formatFullKarton(parseIDR(row[20])), // Real 1+2
            row[21] || '-', // % Tgt 1+2
            getStatusBadge(row[22]), // KET 1+2
            formatFullKarton(parseIDR(row[23])), // Real 1+2+3
            row[24] || '-', // % Tgt 1+2+3
            getStatusBadge(row[25]), // KET FINAL
            row[26] || '-', // Paketan
            formatFullKarton(incentive), // Est Pencapaian Reward
            getStatusBadge(row[28]) // Status
        ]);
    });
    
    document.getElementById('detail-target').textContent = formatNumberKarton(totalTarget);
    document.getElementById('detail-realisasi').textContent = formatNumberKarton(totalRealisasi);
    document.getElementById('detail-reward').textContent = formatNumberKarton(totalIncentive);
    
    let overallPct = totalTarget > 0 ? ((totalRealisasi / totalTarget) * 100).toFixed(1) : 0;
    document.getElementById('detail-pct').innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> ${overallPct}% vs Target`;
    
    drawDepoChart(branches);
    
    // AI insight
    let branchNames = Object.keys(branches);
    branchNames.sort((a, b) => branches[b].realization - branches[a].realization);
    if (branchNames.length > 0) {
        let topB = branchNames[0];
        let topVal = branches[topB].realization;
        document.getElementById('ai-insight-logam').innerHTML = `Berdasarkan filter saat ini, Depo <strong>${topB}</strong> adalah depo dengan performa Logam Mulia tertinggi, mencetak realisasi sebesar <strong>${formatNumberKarton(topVal)}</strong>. Pertahankan pasokan stok untuk menjaga performa depo ini.`;
    } else {
        document.getElementById('ai-insight-logam').innerHTML = `Belum ada data depo yang sesuai dengan kriteria filter saat ini.`;
    }
    
    if (logamDataTable) {
        logamDataTable.destroy();
    }
    
    logamDataTable = $('#dataTable').DataTable({
        data: tableRows,
        pageLength: 10,
        responsive: false,
        scrollX: true,
        autoWidth: false,
        order: [[23, 'desc']] // Sort by Real 1+2+3 (Index 23)
    });
    
    document.getElementById('loading-overlay').classList.add('hidden');
}

function drawDepoChart(branches) {
    let branchNames = Object.keys(branches);
    branchNames.sort((a, b) => branches[b].realization - branches[a].realization);
    let topBranches = branchNames.slice(0, 10);
    
    let targets = topBranches.map(b => branches[b].target);
    let realizations = topBranches.map(b => branches[b].realization);
    
    const ctx = document.getElementById('depoChart').getContext('2d');
    
    if (depoChartInstance) {
        depoChartInstance.destroy();
    }
    
    depoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topBranches,
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
                    data: realizations,
                    backgroundColor: '#7047eb',
                    borderColor: '#5d35d3',
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
                    callbacks: {
                        label: function(context) { return context.dataset.label + ': ' + formatNumberKarton(context.raw); }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    ticks: { callback: function(value) { return formatNumberKarton(value); } }
                },
                x: { grid: { display: false } }
            }
        }
    });
}
