const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?gid=1074980959&single=true&output=csv";

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

function getStatusBadge(status) {
    let s = (status || "").toUpperCase();
    if (s.includes('ON TRACK')) return `<span class="stat-trend positive" style="padding:4px 8px;border-radius:12px;background:var(--positive-bg);color:var(--positive); white-space:nowrap;">On Track</span>`;
    if (s.includes('OFF TRACK')) return `<span class="stat-trend negative" style="padding:4px 8px;border-radius:12px;background:var(--negative-bg);color:var(--negative); white-space:nowrap;">Off Track</span>`;
    return `<span style="white-space:nowrap;">${status || '-'}</span>`;
}

Chart.defaults.color = '#8f8f9d';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

let rwoChartInstance = null;
let rwoDataTable = null;
let rawData = [];
let headers = [];

fetch(sheetURL)
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
    })
    .then(csvText => {
        Papa.parse(csvText, {
            header: false, // Must be false because of duplicate headers in CSV
            skipEmptyLines: true,
            complete: function(results) {
                if(results.data.length > 0) {
                    headers = results.data[0];
                    // Slice from 1 to skip header
                    rawData = results.data.slice(1).filter(row => row[4] && row[4].trim() !== ""); // row[4] is CustomerName
                    initFilter();
                    processData("ALL", "ALL");
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
    const rewardFilter = document.getElementById('rewardFilter');
    const trackFilter = document.getElementById('trackFilter');
    const uniqueRewards = new Set();
    
    rawData.forEach(row => {
        const reward = (row[8] || "").trim(); // row[8] is REWARD
        if (reward) uniqueRewards.add(reward);
    });
    
    Array.from(uniqueRewards).sort().forEach(reward => {
        const option = document.createElement('option');
        option.value = reward;
        option.textContent = reward;
        rewardFilter.appendChild(option);
    });
    
    const triggerFilter = () => {
        processData(rewardFilter.value, trackFilter.value);
    };
    
    rewardFilter.addEventListener('change', triggerFilter);
    trackFilter.addEventListener('change', triggerFilter);
}

function processData(rewardFilter, trackFilter) {
    let filteredData = rawData;
    
    if (rewardFilter !== "ALL") {
        filteredData = filteredData.filter(row => (row[8] || "").trim() === rewardFilter);
    }
    
    if (trackFilter !== "ALL") {
        filteredData = filteredData.filter(row => {
            let s1 = (row[14] || "").toUpperCase(); // Ket Bln 1
            let s2 = (row[17] || "").toUpperCase(); // Ket Bln 2
            let s3 = (row[20] || "").toUpperCase(); // Ket Bln 3
            let sf = (row[26] || "").toUpperCase(); // Ket Final
            
            if (trackFilter === "BLN1") return s1.includes('ON TRACK');
            if (trackFilter === "BLN2") return s2.includes('ON TRACK');
            if (trackFilter === "BLN3") return s3.includes('ON TRACK');
            if (trackFilter === "FINAL") return sf.includes('ON TRACK');
            return true;
        });
    }
    
    let t1 = 0, t2 = 0, t3 = 0;
    let r1 = 0, r2 = 0, r3 = 0;
    let totalIncentive = 0;
    let tableRows = [];
    let onTrackStores = [];
    let finalOnTrackCount = 0;
    
    filteredData.forEach(row => {
        let target1 = parseIDR(row[9]);
        let target2 = parseIDR(row[10]);
        let target3 = parseIDR(row[11]);
        
        let real1 = parseIDR(row[12]);
        let real2 = parseIDR(row[15]);
        let real3 = parseIDR(row[18]);
        
        let incentive = parseIDR(row[28]); // Est Insentif
        
        t1 += target1; t2 += target2; t3 += target3;
        r1 += real1; r2 += real2; r3 += real3;
        totalIncentive += incentive;
        
        let s1 = (row[14] || "").toUpperCase();
        let s2 = (row[17] || "").toUpperCase();
        let s3 = (row[20] || "").toUpperCase();
        let sFinal = (row[26] || "").toUpperCase();
        
        if (sFinal.includes('ON TRACK')) {
            finalOnTrackCount++;
        }
        
        let isAnyOnTrack = s1.includes('ON TRACK') || s2.includes('ON TRACK') || s3.includes('ON TRACK') || sFinal.includes('ON TRACK');
        
        if (isAnyOnTrack && incentive > 0) {
            onTrackStores.push({
                name: row[4], // CustomerName
                incentive: incentive
            });
        }

        tableRows.push([
            row[0] || '-', // REGION
            row[1] || '-', // EntityName
            row[2] || '-', // BranchName
            row[3] || '-', // CustomerId
            row[4] || '-', // CustomerName
            row[5] || '-', // Address
            row[6] || '-', // PhoneNumber
            row[7] || '-', // Lalg
            row[8] || '-', // REWARD
            formatFullCurrency(target1),
            formatFullCurrency(target2),
            formatFullCurrency(target3),
            formatFullCurrency(real1),
            row[13] || '-', // % Tgt 1
            getStatusBadge(row[14]), // Ket Bln 1
            formatFullCurrency(real2),
            row[16] || '-', // % Tgt 2
            getStatusBadge(row[17]), // Ket Bln 2
            formatFullCurrency(real3),
            row[19] || '-', // % Tgt 3
            getStatusBadge(row[20]), // Ket Bln 3
            formatFullCurrency(parseIDR(row[21])), // Real 1+2
            row[22] || '-', // % Tgt 1+2
            getStatusBadge(row[23]), // KET 1+2
            formatFullCurrency(parseIDR(row[24])), // Real 1+2+3
            row[25] || '-', // % Tgt 1+2+3
            getStatusBadge(row[26]), // KET FINAL
            formatFullCurrency(parseIDR(row[27])), // TAMBAHAN 05%
            formatFullCurrency(incentive)
        ]);
    });
    
    document.getElementById('rwo-tgt1').textContent = formatCurrency(t1);
    document.getElementById('rwo-tgt2').textContent = formatCurrency(t2);
    document.getElementById('rwo-tgt3').textContent = formatCurrency(t3);
    document.getElementById('rwo-real1').textContent = formatCurrency(r1);
    document.getElementById('rwo-real2').textContent = formatCurrency(r2);
    document.getElementById('rwo-real3').textContent = formatCurrency(r3);
    
    let realTotal = r1 + r2 + r3;
    document.getElementById('rwo-real-total').textContent = formatCurrency(realTotal);
    document.getElementById('rwo-insentif-total').textContent = formatCurrency(totalIncentive);
    
    // AI Insights
    let insightEl = document.getElementById('ai-insight-rwo-main');
    if (insightEl) {
        if (filteredData.length > 0) {
            let pctOnTrack = ((finalOnTrackCount / filteredData.length) * 100).toFixed(1);
            insightEl.innerHTML = `Dari <strong>${filteredData.length}</strong> toko yang disaring, terdapat <strong>${finalOnTrackCount} toko (${pctOnTrack}%)</strong> yang berstatus <em>On Track Final</em> dengan taksiran insentif <strong>${formatCurrency(totalIncentive)}</strong>. Pantau metrik ini secara ketat untuk meminimalisasi toko yang berguguran di bulan-bulan akhir.`;
        } else {
            insightEl.innerHTML = `Tidak ada data toko yang cocok dengan filter saat ini.`;
        }
    }
    
    drawChart(onTrackStores);
    updateTable(tableRows);
    
    document.getElementById('loading-overlay').classList.add('hidden');
}

function drawChart(stores) {
    stores.sort((a, b) => b.incentive - a.incentive);
    let topStores = stores.slice(0, 15);
    
    let labels = topStores.map(s => s.name.substring(0, 20) + (s.name.length > 20 ? '...' : ''));
    let data = topStores.map(s => s.incentive);
    
    const ctx = document.getElementById('rwoChart').getContext('2d');
    
    if (rwoChartInstance) {
        rwoChartInstance.destroy();
    }
    
    rwoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Est. Insentif',
                data: data,
                backgroundColor: '#2ed573',
                borderColor: '#26af5f',
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
                        label: function(context) {
                            return 'Insentif: ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: function(value) { return formatCurrency(value); } }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}

function updateTable(tableRows) {
    if (rwoDataTable) {
        rwoDataTable.destroy();
    }
    rwoDataTable = $('#dataTable').DataTable({
        data: tableRows,
        pageLength: 10,
        responsive: false, // disable responsive hiding, we want scrollX
        scrollX: true,
        autoWidth: false,
        order: [[28, 'desc']] // Sort by Insentif
    });
}
