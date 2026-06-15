const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgZ0VTezYS3OB0aWyan9kCFqzGO5BaBCtzJ85wuMEhqFF7XMa3DyXPPIVz3I3pKsQchlKj1bLBtE4v/pub?output=csv";

// Helper for parsing tricky currency formats from CSV
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

// Format numbers nicely
function formatCurrency(num) {
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) return "Rp " + (num / 1000000000).toFixed(1) + "B";
    if (absNum >= 1000000) return "Rp " + (num / 1000000).toFixed(1) + "M";
    if (absNum >= 1000) return "Rp " + (num / 1000).toFixed(1) + "K";
    return "Rp " + num.toFixed(0);
}

// Full currency for tables
function formatFullCurrency(num) {
    return "Rp " + Math.round(num).toLocaleString('id-ID');
}

// Setup chart defaults
Chart.defaults.color = '#8f8f9d';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

let depoChartInstance = null;

// Fetch and process data directly
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
                processDetailData(results.data);
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
            <p style="font-size: 12px; margin-top: 8px; color: #8f8f9d;">Please check your internet connection.</p>
        </div>
    `;
}

function processDetailData(data) {
    let totalTarget = 0;
    let totalRealisasi = 0;
    let totalIncentive = 0;
    
    let branches = {};
    let tableRows = [];
    
    let validData = data.filter(row => row.CustomerName && row.CustomerName.trim() !== "");
    
    validData.forEach(row => {
        let target = parseIDR(row['Target3Bulan']);
        let rm1 = parseIDR(row['RealisasiBulan1']);
        let rm2 = parseIDR(row['RealisasiBulan2']);
        let rm3 = parseIDR(row['RealisasiBulan3']);
        let incentive = parseIDR(row[' EST INSENTIF JIKA CAPAI ']);
        
        let realization = rm1 + rm2 + rm3;
        
        totalTarget += target;
        totalRealisasi += realization;
        totalIncentive += incentive;
        
        // Group by Branch
        let branch = row['BranchName'] || 'Unknown';
        if (!branches[branch]) {
            branches[branch] = { target: 0, realization: 0 };
        }
        branches[branch].target += target;
        branches[branch].realization += realization;
        
        let pct = target > 0 ? ((realization / target) * 100).toFixed(1) : 0;
        let status = pct >= 100 ? '<span class="stat-trend positive" style="padding:4px 8px;border-radius:12px;background:var(--positive-bg);color:var(--positive);">On Track</span>' 
                   : '<span class="stat-trend negative" style="padding:4px 8px;border-radius:12px;background:var(--negative-bg);color:var(--negative);">Off Track</span>';
        if (target === 0) status = 'No Target';

        // Prepare row for DataTable
        tableRows.push([
            row['CustomerName'],
            branch,
            formatFullCurrency(target),
            formatFullCurrency(realization),
            pct + '%',
            formatFullCurrency(incentive),
            status
        ]);
    });
    
    // Update top cards
    document.getElementById('detail-target').textContent = formatCurrency(totalTarget);
    document.getElementById('detail-realisasi').textContent = formatCurrency(totalRealisasi);
    document.getElementById('detail-reward').textContent = formatCurrency(totalIncentive);
    
    let overallPct = totalTarget > 0 ? ((totalRealisasi / totalTarget) * 100).toFixed(1) : 0;
    document.getElementById('detail-pct').innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> ${overallPct}% vs Target`;
    
    // Draw Depo Chart
    drawDepoChart(branches);
    
    // Initialize DataTable
    $('#dataTable').DataTable({
        data: tableRows,
        pageLength: 10,
        responsive: true,
        order: [[3, 'desc']] // Sort by Realisasi Total descending by default
    });
    
    document.getElementById('loading-overlay').classList.add('hidden');
}

function drawDepoChart(branches) {
    let branchNames = Object.keys(branches);
    // Sort branches by highest realization
    branchNames.sort((a, b) => branches[b].realization - branches[a].realization);
    
    // Take top 10 to keep chart readable
    let topBranches = branchNames.slice(0, 10);
    
    let targets = topBranches.map(b => branches[b].target);
    let realizations = topBranches.map(b => branches[b].realization);
    
    const ctx = document.getElementById('depoChart').getContext('2d');
    
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
                legend: {
                    position: 'top',
                    labels: { color: '#f0f0f5' }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 35, 0.9)',
                    titleColor: '#f0f0f5',
                    bodyColor: '#a0a0b0',
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    ticks: {
                        callback: function(value) { return formatCurrency(value); }
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}
