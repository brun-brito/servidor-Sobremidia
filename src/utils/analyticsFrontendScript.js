let currentSort = {
    tableId: '',
    column: '',
    direction: 'asc'
};

const charts = {};

const diasSemanaOrdem = {
    "Domingo": 0,
    "Segunda-feira": 1,
    "Terça-feira": 2,
    "Quarta-feira": 3,
    "Quinta-feira": 4,
    "Sexta-feira": 5,
    "Sábado": 6
};

let address = [];

let currentPage = 1;
const rowsPerPage = 10;
let camerasData = [];

/*
FUNÇÕES PARA A SEÇÃO TOTAL
*/
function carregarTotal() {
document.getElementById("totalAudience").innerText = Math.round(dadosApi.total.audience).toLocaleString('pt-BR');
document.getElementById("totalImpact").innerText = Math.round(dadosApi.total.impact).toLocaleString('pt-BR');
document.getElementById("frequency").innerText = dadosApi.total.frequency.toLocaleString('pt-BR');
document.getElementById("dwellTime").innerText = dadosApi.total.dwell_time.toLocaleString('pt-BR') + "s";
document.getElementById("medianDays").innerText = dadosApi.total.median_days_monitored.toLocaleString('pt-BR');
document.getElementById("locations").innerText = dadosApi.total.locations.toLocaleString('pt-BR');
}

/*
FUNÇÕES PARA A SEÇÃO ADDRESS
*/
function carregarEnderecos() {
const addressesList = document.getElementById("addressesList");

// const paineis = window.paineis || [];

address = dadosApi.locations.map(loc => {
    const painel = paineis.find(p => p.local == loc.id);
    return {
        id: loc.id,
        nome: painel ? painel.nameManager : `-`,
        audiencia: Math.round(loc.audience).toLocaleString('pt-BR'),
        impacto: Math.round(loc.impact).toLocaleString('pt-BR'),
        frequencia: loc.frequency.toLocaleString('pt-BR'),
        dwellTime: `${loc.dwell_time}s`,
        medianDays: loc.median_days_monitored.toLocaleString('pt-BR'),
        minDate: loc.min_date.split("-").reverse().join("/"),
        maxDate: loc.max_date.split("-").reverse().join("/")
    };
});

addressesList.innerHTML = "";
address.forEach(loc => {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${loc.nome}</td>
        <td>${loc.audiencia}</td>
        <td>${loc.impacto}</td>
        <td>${loc.frequencia}</td>
        <td>${loc.dwellTime}</td>
        <td>${loc.medianDays}</td>
        <td>${loc.minDate}</td>
        <td>${loc.maxDate}</td>
    `;
    addressesList.appendChild(row);
});
document.querySelectorAll('.address-table th').forEach(header => {
    header.addEventListener('click', () => {
    const column = header.dataset.column;
    const isNumeric = ['audiencia', 'impacto', 'frequencia', 'dwellTime', 'medianDays'].includes(column);
    sortTable('addressesTable', column, isNumeric);
    updateSortIcons('addressesTable', header, column);
    });
});
sortTable('addressesTable', 'local', false);
sortTable('addressesTable', 'local', false); // chama duas vezes pra ficar asc
}

/*
FUNÇÕES PARA A SEÇÃO AUDIENCE-IMPACT
*/
function carregarAudienciaImpacto() {
const dailyCtx = document.getElementById('dailyChart').getContext('2d');
const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');

// Dados para o gráfico diário
const dailyData = dadosApi.audience_x_impact.daily.map(item => ({
    date: item.date.split("-").reverse().join("/"),
    audience: item.audience,
    impact: item.impact,
    dwell_time: item.dwell_time
}));

// Ordena as datas do gráfico diário
dailyData.sort((a, b) => new Date(a.date.split("/").reverse().join("-")) - new Date(b.date.split("/").reverse().join("-")));

const dailyLabels = dailyData.map(item => item.date);
const dailyAudience = dailyData.map(item => item.audience);
const dailyImpact = dailyData.map(item => item.impact);
const dailyDwellTime = dailyData.map(item => item.dwell_time);

// Ajusta o tamanho do container do gráfico diário
const dailyChartContainer = document.querySelector('.chart-body');
const totalLabels = dailyLabels.length;
if (totalLabels > 3) {
    dailyChartContainer.style.width = (800 + (totalLabels - 3) * 40) + 'px';
}

const dailyDataTable = document.getElementById('dailyDataTable');
dailyDataTable.innerHTML = '';
dailyData.forEach(item => {
    dailyDataTable.innerHTML += `<tr>
        <td>${item.date}</td>
        <td>${Math.round(item.audience).toLocaleString('pt-BR')}</td>
        <td>${Math.round(item.impact).toLocaleString('pt-BR')}</td>
        <td>${Math.round(item.dwell_time)}s</td>
    </tr>`;
});

document.querySelectorAll('.audience-table th').forEach(header => {
    header.addEventListener('click', () => {
    const column = header.dataset.column;
    const isNumeric = ['audience', 'impact'].includes(column);
    sortTable('audienceTable', column, isNumeric);
    updateSortIcons('audienceTable', header, column);
    });
});

charts.daily = new Chart(dailyCtx, {
    type: 'bar',
    data: {
        labels: dailyLabels,
        datasets: [
            {
                label: 'Impactos',
                data: dailyImpact,
                backgroundColor: '#4887F3',
                yAxisID: 'y-axis-impact',
            },
            {
                label: 'Audiência',
                data: dailyAudience,
                backgroundColor: '#35C759',
                yAxisID: 'y-axis-impact',
            },
            {
                label: 'Dwell Time',
                data: dailyDwellTime,
                type: 'line',
                borderColor: '#FFA500',
                backgroundColor: '#FFA500',
                fill: false,
                yAxisID: 'y-axis-dwell',
            }
        ]
    },
    options: {
        barPercentage: 0.9,
        categoryPercentage: 0.7,
        aspectRatio: 1,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                ticks: { 
                    font: { size: 14 }, 
                    color: '#ffffff',
                    maxRotation: 90,
                    minRotation: 30
                },
                title: {
                    display: true,
                    text: 'Data',
                    font: { size: 18 }
                }
            },
            'y-axis-impact': {
                position: 'left',
                ticks: { font: { size: 14 }, color: '#ffffff' },
                title: {
                    display: true,
                    text: 'Impactos / Audiência',
                    font: { size: 18 }
                }
            },
            'y-axis-dwell': {
                position: 'right',
                ticks: { font: { size: 14 }, color: '#ffffff' },
                title: {
                    display: true,
                    text: 'Dwell Time',
                    font: { size: 18 }
                }
            }
        },
        plugins: {
            legend: { position: 'top', align: 'start', labels: { color: '#ffffff' } },
            tooltip: {
                callbacks: {
                    label: function(tooltipItem) {
                        return `${tooltipItem.dataset.label}: ${Math.round(tooltipItem.raw).toLocaleString('pt-BR')}`;
                    }
                }
            },
            datalabels: {
                align: 'top',
                color: '#ffffff',
                font: {
                    weight: 'bold',
                    size: 12
                },
                formatter: function(value) {
                    if (value >= 1000) {
                        return Math.round(value / 1000) + 'k';
                    }
                    return value > 0 ? value.toLocaleString('pt-BR') : '';
                }
            }
        }
    },
    plugins:  [
        {
        id: 'custom_canvas_background_color',
        beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#a1a1a178';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
        },
        ChartDataLabels
    ]
});

// Dados para o gráfico semanal
const ordemDias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const weeklyData = dadosApi.audience_x_impact.weekly.map(item => ({
    name: item.name,
    audience: item.audience,
    impact: item.impact,
    dwell_time: item.dwell_time
}));

// Organiza os dias da semana na ordem correta
const weeklyDataTable = document.getElementById('weeklyDataTable');
weeklyDataTable.innerHTML = '';

const weeklyAggregatedData = ordemDias.map(dia => {
    const item = weeklyData.find(data => {
        switch (data.name.toLowerCase()) {
            case 'sunday': return dia === 'Domingo';
            case 'monday': return dia === 'Segunda-feira';
            case 'tuesday': return dia === 'Terça-feira';
            case 'wednesday': return dia === 'Quarta-feira';
            case 'thursday': return dia === 'Quinta-feira';
            case 'friday': return dia === 'Sexta-feira';
            case 'saturday': return dia === 'Sábado';
            default: return false;
        }
        }) || { audience: 0, impact: 0, dwell_time: 0 };

        weeklyDataTable.innerHTML += `<tr>
            <td>${dia}</td>
            <td>${Math.round(item.audience).toLocaleString('pt-BR')}</td>
            <td>${Math.round(item.impact).toLocaleString('pt-BR')}</td>
            <td>${Math.floor(item.dwell_time / 60)}m ${(item.dwell_time % 60).toString().padStart(2, '0')}s</td>
        </tr>`;
//const seconds = Math.round((value - minutes) * 60).toString().padStart(2, '0');
        return {
            label: dia,
            audience: item.audience,
            impact: item.impact,
            dwell_time: item.dwell_time
        };
    });

document.querySelectorAll('.audience-table-weekly th').forEach(header => {
    header.addEventListener('click', () => {
    const column = header.dataset.column;
    const isNumeric = ['audience', 'impact'].includes(column);
    sortTable('audienceTable-weekly', column, isNumeric);
    updateSortIcons('audienceTable-weekly', header, column);
    });
});

const weeklyLabels = weeklyAggregatedData.map(d => d.label);
const weeklyAudience = weeklyAggregatedData.map(d => d.audience);
const weeklyImpact = weeklyAggregatedData.map(d => d.impact);
const weeklyDwellTime = weeklyAggregatedData.map(d => d.dwell_time / 60);

charts.weekly = new Chart(weeklyCtx, {
    type: 'bar',
    data: {
        labels: weeklyLabels,
        datasets: [
            {
                label: 'Impactos',
                data: weeklyImpact,
                backgroundColor: '#4887F3',
                yAxisID: 'y-axis-impact',
            },
            {
                label: 'Audiência',
                data: weeklyAudience,
                backgroundColor: '#35C759',
                yAxisID: 'y-axis-impact',
            },
            {
                label: 'Dwell Time',
                data: weeklyDwellTime,
                type: 'line',
                borderColor: '#FFA500',
                backgroundColor: '#FFA500',
                fill: false,
                yAxisID: 'y-axis-dwell',
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                ticks: { font: { size: 14}, color: '#ffffff'},
                title: {
                    display: true,
                    text: 'Dia da semana',
                    font: {
                        size: 18
                    }
                }
            },
            'y-axis-impact': {
                position: 'left',
                ticks: { font: { size: 14}, color: '#ffffff'},
                title: {
                    display: true,
                    text: 'Impactos / Audiência',
                    font: {
                        size: 18
                    }
                }
            },
            'y-axis-dwell': {
                position: 'right',
                ticks: { font: { size: 14}, color: '#ffffff'},
                title: {
                    display: true,
                    text: 'Dwell Time',
                    font: {
                        size: 18
                    }
                }
            }
        },
        plugins: {
            legend: { position: 'top', align: 'start', labels: { color: '#ffffff' } },
            tooltip: {
                callbacks: {
                    label: function(tooltipItem) {
                        let value = tooltipItem.raw;
                        if (tooltipItem.dataset.label === 'Dwell Time') {
                            const minutes = Math.floor(value);
                            const seconds = Math.round((value - minutes) * 60).toString().padStart(2, '0');
                            return `${tooltipItem.dataset.label}: ${minutes}m ${seconds}s`;
                        }
                        return `${tooltipItem.dataset.label}: ${Math.round(value).toLocaleString('pt-BR')}`;
                    }
                }
                },
                datalabels: {
                    align: 'top',
                    color: '#ffffff',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: function(value, context) {
                        if (context.dataset.label === 'Dwell Time') {
                            const minutes = Math.floor(value);
                            const seconds = Math.round((value - minutes) * 60).toString().padStart(2, '0');
                            return `${minutes}m ${seconds}s`;
                        }
                        if (value >= 1000000) {
                            return `${(value / 1000000).toFixed(1)} mi`;
                        }
                        if (value >= 1000) {
                            return `${Math.round(value / 1000)}k`;
                        }
                        return value > 0 ? value.toLocaleString('pt-BR') : '';
                    }
            }
        }
    },
    plugins: [
        {
        id: 'custom_canvas_background_color',
        beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#a1a1a178';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
        },
        ChartDataLabels
    ]
});
}

/*
FUNÇÕES PARA A SEÇÃO AVG
*/
function carregarAvg() {
const hourCtx = document.getElementById('hourlyChart').getContext('2d');
const shiftCtx = document.getElementById('shiftChart').getContext('2d');

let horas = dadosApi.impacts_per_hour.average.map(item => ({
    hour: parseInt(item.hour),
    impact: item.impact
}));

horas.sort((a, b) => a.hour - b.hour);

const horasFormatadas = horas.map(item => `${item.hour.toString().padStart(2, '0')}:00`);
const impactosHora = horas.map(item => item.impact);

const periodosOrdem = ["early_morning", "morning", "afternoon", "night"];
const periodos = [];
const impactosPeriodo = [];

periodosOrdem.forEach(turno => {
    const item = dadosApi.impacts_per_hour.period.find(p => p.name === turno);
    if (item) {
        periodos.push(
            turno === "early_morning" ? "Madrugada" :
            turno === "morning" ? "Manhã" :
            turno === "afternoon" ? "Tarde" :
            "Noite"
        );
        impactosPeriodo.push(item.impact);
    }
});

charts.hour = new Chart(hourCtx, {
    type: 'bar',
    data: {
        labels: horasFormatadas,
        datasets: [{
            label: 'Impactos por Hora',
            data: impactosHora,
            backgroundColor: '#4887F3',
            borderRadius: 20,
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                ticks: { 
                    font: { size: 14, color: '#ffffff' },
                    color: '#ffffff',
                    maxRotation: 0
                },
                title: {
                    display: true,
                    text: 'Horário',
                    font: {
                        size: 18
                    }
                }
            },
            y: { 
                beginAtZero: true,
                ticks: { 
                    font: { size: 14, color: '#ffffff' },
                    color: '#ffffff'
                },
                title: {
                    display: true,
                    text: 'Impactos',
                    font: {
                        size: 18
                    }
                }
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(tooltipItem) {
                        return `${tooltipItem.dataset.label}: ${Math.round(tooltipItem.raw).toLocaleString('pt-BR')}`;
                    }
                }
            },
            legend: {
                labels: {
                    color: '#ffffff',
                    font: {
                        size: 14
                    }
                }
            },datalabels: {
                anchor: 'end',
                align: 'top',
                color: '#4887F3',
                font: {
                    weight: 'bold',
                    size: 14
                },
                formatter: function(value) {
                    if (value >= 1000000) {
                        return `${(value / 1000000).toFixed(1)} mi`;
                    }
                    if (value >= 1000) {
                        return `${Math.round(value / 1000)}k`;
                    }
                    return value > 0 ? value.toLocaleString('pt-BR') : '';
                }
            }
        }
    },
    plugins: [
        {
        id: 'custom_canvas_background_color',
        beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#a1a1a178';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
        },
        ChartDataLabels
    ]
});

charts.shift = new Chart(shiftCtx, {
        type: 'bar',
        data: {
            labels: periodos,
            datasets: [{
                label: 'Impactos por Turno',
                data: impactosPeriodo,
                backgroundColor: '#4887F3',
                borderRadius: {
                    topLeft: 100,
                    topRight: 100,
                    bottomLeft: 0,
                    bottomRight: 0
                },
                barPercentage: 1.3,
                categoryPercentage: 0.5,
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: { 
                        font: { size: 18, color: '#ffffff' },
                        color: '#ffffff'
                    },
                    title: {
                        display: true,
                        text: 'Turno',
                        font: {
                            size: 18
                        }
                    }
                },
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        font: { size: 18, color: '#ffffff' },
                        color: '#ffffff'
                    },
                    title: {
                        display: true,
                        text: 'Impactos',
                        font: {
                            size: 18
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${tooltipItem.dataset.label}: ${Math.round(tooltipItem.raw).toLocaleString('pt-BR')}`;
                        }
                    }
                },
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 14
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#4887F3',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: function(value) {
                        if (value >= 1000000) {
                            return `${(value / 1000000).toFixed(1)} mi`;
                        }
                        if (value >= 1000) {
                            return `${Math.round(value / 1000)}k`;
                        }
                        return value > 0 ? value.toLocaleString('pt-BR') : '';
                    }
                }
            }
        },
        plugins: [
        {
        id: 'custom_canvas_background_color',
        beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#a1a1a178';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
        },
        ChartDataLabels
    ]
    });
}

/*
FUNÇÕES PARA A SEÇÃO RECURRENCE
*/
function carregarRecurrence() {
    const recurrenceCtx = document.getElementById('recurrenceChart').getContext('2d');
    const recurrenceDataTable = document.getElementById('recurrenceDataTable');
    recurrenceDataTable.innerHTML = '';

    const recurrenceData = dadosApi.recurrence.map(item => ({
        multiplier: item.multiplier === "15x or more" ? "15x ou mais" : item.multiplier,
        count: item.count,
        percentage: item.percentage
    }));

    recurrenceData.sort((a, b) => b.count - a.count);

    // Popula a tabela com os dados de recorrência
    recurrenceData.forEach(item => {
        recurrenceDataTable.innerHTML += `<tr>
            <td>${item.multiplier}</td>
            <td>${item.count.toLocaleString('pt-BR')}</td>
            <td>${Math.round(item.percentage * 100)/100}%</td>
        </tr>`;
    });

    const recurrenceLabels = recurrenceData.map(d => d.multiplier);
    const recurrenceValues = recurrenceData.map(d => d.count);
    const recurrenceColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#C9CBCF', '#FF5733', '#8A5CF6', '#4887F3',
        '#35C759', '#FFA500', '#DC3545', '#6A0572', '#F48FB1'
    ];


document.querySelectorAll('.recurrence-table th').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const isNumeric = ['value', 'percentage'].includes(column);
            sortTable('recurrenceTable', column, isNumeric);
            updateSortIcons('recurrenceTable', header, column);
        });
    });

    charts.recurrence = new Chart(recurrenceCtx, {
        type: 'bar',
        data: {
            labels: recurrenceLabels,
            datasets: [{
                label: 'Recorrência',
                data: recurrenceValues,
                backgroundColor: recurrenceColors.slice(0, recurrenceData.length)
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#ffffff', font: { size: 16 } },
                    title: { display: true, text: 'Quantidade', font: { size: 20 } }
                },
                y: {
                    ticks: { color: '#ffffff', font: { size: 18 } }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: { size: 18 },
                        usePointStyle: true,
                        pointStyle: 'line'
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    color: '#ffffff',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: function(value) {
                        if (value >= 1000000) {
                            return `${(value / 1000000).toFixed(1)} mi`;
                        }
                        if (value >= 1000) {
                            return `${Math.round(value / 1000)}k`;
                        }
                        return value > 0 ? value.toLocaleString('pt-BR') : '';
                    }
                }
            }
        },
        plugins: [
        {
        id: 'custom_canvas_background_color',
        beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#a1a1a178';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
        },
        ChartDataLabels
    ]
    });
}

/*
FUNÇÃO PARA A SEÇÃO CÂMERAS
*/
function renderCamerasTable(page = 1) {
    const camerasDataTable = document.getElementById('camerasDataTable');
    camerasDataTable.innerHTML = '';

    // Agrupar camerasData por name (localização)
    const grouped = {};
    camerasData.forEach(item => {
        if (!grouped[item.name]) grouped[item.name] = [];
        grouped[item.name].push(item);
    });

    const groupedKeys = Object.keys(grouped).sort();
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginated = groupedKeys.slice(startIndex, endIndex);

    paginated.forEach(name => {
        const group = grouped[name];
        if (group.length === 1) {
            const item = group[0];
            camerasDataTable.innerHTML += `<tr>
                <td>${item.name}</td>
                <td>${item.cars.toLocaleString('pt-BR')}</td>
                <td>${item.buses.toLocaleString('pt-BR')}</td>
                <td>${item.trucks.toLocaleString('pt-BR')}</td>
                <td>${item.vans.toLocaleString('pt-BR')}</td>
                <td>${item.motorcycles.toLocaleString('pt-BR')}</td>
                <td>${item.people.toLocaleString('pt-BR')}</td>
                <td>${item.impact_total.toLocaleString('pt-BR')}</td>
                <td>${item.id}</td>
                <td>${item.date}</td>
            </tr>`;
        } else {
            // Somar os campos numéricos
            const sum = (key) => group.reduce((acc, curr) => acc + (curr[key] || 0), 0);
            camerasDataTable.innerHTML += `<tr>
                <td>${name}</td>
                <td>${sum('cars').toLocaleString('pt-BR')}</td>
                <td>${sum('buses').toLocaleString('pt-BR')}</td>
                <td>${sum('trucks').toLocaleString('pt-BR')}</td>
                <td>${sum('vans').toLocaleString('pt-BR')}</td>
                <td>${sum('motorcycles').toLocaleString('pt-BR')}</td>
                <td>${sum('people').toLocaleString('pt-BR')}</td>
                <td>${sum('impact_total').toLocaleString('pt-BR')}</td>
                <td>${group[0].id}</td>
                <td><a href="#" onclick="mostrarModalDetalhes('${name.replace(/'/g, "\\'")}');return false;">Detalhes</a></td>
            </tr>`;
        }
    });

    document.getElementById('pageInfo').innerText = `Página ${page} de ${Math.ceil(groupedKeys.length / rowsPerPage)}`;

    document.querySelectorAll('.cameras-table th').forEach(header => {
        header.removeEventListener('click', header._sortHandler);
        const handler = () => {
            const column = header.dataset.column;
            const isNumeric = ['cars', 'buses', 'trucks', 'vans', 'motorcycles', 'people', 'impact_total'].includes(column);
            if (currentSort.tableId === 'camerasTable' && currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort = { tableId: 'camerasTable', column, direction: 'asc' };
            }
            camerasData.sort((a, b) => {
                let aValue = a[column];
                let bValue = b[column];
                if (column.toLowerCase().includes("date")) {
                    aValue = new Date(aValue.split("/").reverse().join("-"));
                    bValue = new Date(bValue.split("/").reverse().join("-"));
                } else if (isNumeric) {
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                } else {
                    aValue = aValue.toString().toLowerCase();
                    bValue = bValue.toString().toLowerCase();
                }
                if (aValue < bValue) return currentSort.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
            updateSortIcons('camerasTable', header, column);
            renderCamerasTable(currentPage);
        };
        header._sortHandler = handler;
        header.addEventListener('click', handler);
    });
}
// Função para mostrar modal de detalhes agrupados por local
function mostrarModalDetalhes(localName) {
    let modal = document.getElementById('modal-detalhes');
    if (!modal) {
        // Cria o div do modal se não existir
        modal = document.createElement('div');
        modal.id = 'modal-detalhes';
        document.body.appendChild(modal);
    }
    // Ordena por data ascendente
    const conteudo = camerasData
        .filter(d => d.name === localName)
        .sort((a, b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')))
        .map(item => `
            <tr>
                <td style="text-align:left;padding:8px;">${item.date}</td>
                <td style="text-align:right;padding:8px;">${item.cars.toLocaleString('pt-BR')}</td>
                <td style="text-align:right;padding:8px;">${item.buses.toLocaleString('pt-BR')}</td>
                <td style="text-align:right;padding:8px;">${item.trucks.toLocaleString('pt-BR')}</td>
                <td style="text-align:right;padding:8px;">${item.vans.toLocaleString('pt-BR')}</td>
                <td style="text-align:right;padding:8px;">${item.motorcycles.toLocaleString('pt-BR')}</td>
                <td style="text-align:right;padding:8px;">${item.people.toLocaleString('pt-BR')}</td>
                <td style="text-align:right;padding:8px;">${item.impact_total.toLocaleString('pt-BR')}</td>
            </tr>
        `).join('');
    modal.innerHTML = `
        <div class="modal-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:10000;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
            <div class="modal-content" style="color:black;background:#fff;padding:30px 20px 20px 20px;max-width:90vw;max-height:90vh;overflow:auto;border-radius:10px;box-shadow:0 2px 16px #0006;position:relative;">
                <button onclick="document.getElementById('modal-detalhes').innerHTML = '';" 
                    style="position:absolute;top:10px;right:15px;font-size:24px;font-weight:bold;background:none;border:none;color:#444;cursor:pointer;">×</button>
                <h3 style="text-align:center;font-size:22px;margin:0 0 16px 0;">Detalhes para ${localName}</h3>
                <table style="border-collapse:collapse;width:100%;margin-top:8px;font-size:15px;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px;border-bottom:1px solid #ccc;">Data</th>
                            <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Carros</th>
                            <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Ônibus</th>
                            <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Caminhões</th>
                            <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Vans</th>
                            <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Motos</th>
                            <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Pessoas</th>
                            <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Impacto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${conteudo}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const tbody = modal.querySelector("tbody");
    Array.from(tbody.rows).forEach((row, index) => {
        row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
        row.addEventListener("mouseenter", () => row.style.backgroundColor = "#eef");
        row.addEventListener("mouseleave", () => row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff');
    });
}

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderCamerasTable(currentPage);
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < Math.ceil(camerasData.length / rowsPerPage)) {
        currentPage++;
        renderCamerasTable(currentPage);
    }
});

function carregarCameras() {
    const hasData = dadosApi.cameras?.per_type?.length > 0;

    const noDataEl = document.getElementById('cameras-no-data');
    const contentEl = document.getElementById('cameras-content');

    if (!hasData) {
    noDataEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
    } else {
    noDataEl.style.display = 'none';
    contentEl.style.display = 'block';
    }

    const canvasEl = document.getElementById('camerasChart');
    if (!canvasEl) return;

    const camerasCtx = canvasEl.getContext('2d');
    const camerasDataTable = document.getElementById('camerasDataTable');
    camerasDataTable.innerHTML = '';

    const groupedData = {};

    dadosApi.cameras.per_type.forEach(item => {
        const date = item.date.split("-").reverse().join("/");
        if (!groupedData[date]) {
            groupedData[date] = {};
        }
        groupedData[date][item.name] = item.impact_total;
    });

    // Criar listas para alimentar o gráfico
    const allDates = Object.keys(groupedData).sort((a, b) => new Date(a.split("/").reverse().join("-")) - new Date(b.split("/").reverse().join("-")));
    const allLocations = [...new Set(dadosApi.cameras.per_type.map(item => item.name))];
    const baseColors = [
        { h: 145, s: 50, l: 45 },
        { h: 200, s: 50, l: 45 },
        { h: 35, s: 70, l: 50 }, 
        { h: 250, s: 50, l: 50 },
        { h: 0, s: 60, l: 45 }   
    ];
    
    const generateColor = (index) => {
        const color = baseColors[index % baseColors.length];
        return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    };
    const datasets = allLocations.map((location, index) => ({
        label: location,
        data: allDates.map(date => groupedData[date][location] || 0),
        backgroundColor: generateColor(index),
    }));

    charts.cameras = new Chart(camerasCtx, {
        type: 'bar',
        data: {
            labels: allDates,
            datasets: datasets
        },
        options: {
            indexAxis: 'x',
            // barPercentage: 1,
            // categoryPercentage: 1,
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#ffffff' },
                    title: { display: true, text: 'Data' },
                    barPercentage: 0.7,
                    categoryPercentage: 0.5
                },
                y: {
                    ticks: { color: '#ffffff' },
                    title: { display: true, text: 'Impactos' }
                }
            },
            plugins: {                
                legend: { position: 'top', align: 'start', labels: { color: '#ffffff' } },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${tooltipItem.dataset.label}: ${Math.round(tooltipItem.raw).toLocaleString('pt-BR')}`;
                        }
                    }
                },
                datalabels: {
                    anchor: 'end', // Define a posição no topo da barra
                    align: 'top',
                    color: '#ffffff',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: function(value) {
                        if (value >= 1000) {
                            return Math.round(value / 1000) + 'k';
                        }
                        return value > 0 ? value.toLocaleString('pt-BR') : '';
                    }
                }
            }
        },
        plugins: [
        {
        id: 'custom_canvas_background_color',
        beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#a1a1a178';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
        },
        ChartDataLabels
    ] 
    });

    // Ajustar o tamanho do container do gráfico para permitir rolagem horizontal
    const totalLabels = allDates.length;
    const chartContainer = document.querySelector('.chart-body-cameras');
    requestAnimationFrame(() => {
        if (totalLabels > 5) {
            const calculatedWidth = 800 + (totalLabels - 5) * 188;
            chartContainer.style.width = `${Math.min(calculatedWidth, 9100)}px`;
        } else {
            chartContainer.style.width = '100%';
        }
    });

    // Renderizar os dados da tabela paginada
    camerasData = dadosApi.cameras.per_type.map(item => ({
        id: item.id,
        date: item.date.split("-").reverse().join("/"),
        impact_total: item.impact_total,
        cars: item.cars,
        buses: item.buses,
        trucks: item.trucks,
        vans: item.vans,
        motorcycles: item.motorcycles,
        people: item.people,
        name: item.name
    }));

    camerasData.sort((a, b) => new Date(a.date.split("/").reverse().join("-")) - new Date(b.date.split("/").reverse().join("-")));

    renderCamerasTable(currentPage);
}

/*
FUNÇÕES PARA USO GERAL
*/
function toggleSection(sectionId) {
const section = document.getElementById(sectionId);
const content = section.querySelector(`.${sectionId}-container`);
const icon = section.querySelector('.toggle-button i');

if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-up');
} else {
    content.classList.add('collapsed');
    icon.classList.remove('fa-chevron-up');
    icon.classList.add('fa-chevron-down');
}
}

function sortTable(tableId, column, isNumeric) {
    const table = document.getElementById(tableId);
    const rows = Array.from(table.querySelectorAll("tbody tr")); 
    const headers = table.querySelectorAll("th");
    const columnIndex = Array.from(headers).findIndex(header => header.dataset.column === column);

    // Ajusta a direção do sort
    if (currentSort.tableId === tableId && currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort = { tableId, column, direction: 'asc' };
    }

    // Ordena as linhas
    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].innerText.trim();
        let bValue = b.cells[columnIndex].innerText.trim();
        
        if (column.toLowerCase().includes("date")) {
            aValue = new Date(aValue.split("/").reverse().join("-"));
            bValue = new Date(bValue.split("/").reverse().join("-"));
            return currentSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        if (column.toLowerCase().includes("day")) {
            aValue = diasSemanaOrdem[aValue] ?? 7;
            bValue = diasSemanaOrdem[bValue] ?? 7;
            return currentSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        if (column.toLowerCase().includes("recurrence")) {
            const aNum = parseInt(aValue.replace(/[^0-9]/g, "")) || 0;
            const bNum = parseInt(bValue.replace(/[^0-9]/g, "")) || 0;
            return currentSort.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        if (isNumeric) {
            aValue = parseFloat(aValue.replace(/\./g, '').replace(',', '.')) || 0;
            bValue = parseFloat(bValue.replace(/\./g, '').replace(',', '.')) || 0;
            return currentSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        } else {
            return currentSort.direction === 'asc' 
                ? aValue.localeCompare(bValue) 
                : bValue.localeCompare(aValue);
        }
    });

    rows.forEach(row => table.querySelector("tbody").appendChild(row));
}

function updateSortIcons(tableId, currentHeader, column) {
    const table = document.getElementById(tableId);
    const headers = table.querySelectorAll("th");

    headers.forEach(header => {
        header.classList.remove('asc', 'desc');
        header.querySelector('.sort-icon')?.remove();
    });

    currentHeader.classList.add(currentSort.direction);

    const sortIcon = document.createElement('span');
    sortIcon.classList.add('sort-icon');
    sortIcon.innerHTML = currentSort.direction === 'asc'
    ? '<i class="fas fa-sort-up"></i>'
    : '<i class="fas fa-sort-down"></i>';

    currentHeader.appendChild(sortIcon);
}

function inicializarDashboard(dadosApi) {
    destruirGraficos();

    const isVazio = (
    (!dadosApi.total || !dadosApi.total.audience) &&
    (!dadosApi.audience_x_impact || (dadosApi.audience_x_impact.daily?.length === 0 && dadosApi.audience_x_impact.weekly?.length === 0)) &&
    (!dadosApi.impacts_per_hour || (dadosApi.impacts_per_hour.average?.length === 0 && dadosApi.impacts_per_hour.period?.length === 0)) &&
    (!dadosApi.cameras || dadosApi.cameras.per_type?.length === 0) &&
    (!dadosApi.recurrence || dadosApi.recurrence?.length === 0) &&
    (!dadosApi.locations || dadosApi.locations?.length === 0)
    );

    const semDadosEl = document.getElementById('impact-no-data');
    const conteudoEl = document.querySelector('#impact-result .dashboard-container');

    if (isVazio) {
        if (semDadosEl) semDadosEl.style.display = 'block';
        if (conteudoEl) conteudoEl.style.display = 'none';
        return;
    } else {
        if (semDadosEl) semDadosEl.style.display = 'none';
        if (conteudoEl) conteudoEl.style.display = 'block';
    }

    carregarTotal();
    carregarEnderecos();
    carregarAvg();
    carregarAudienciaImpacto();
    carregarRecurrence();
    carregarCameras();
}

function destruirGraficos() {
    for (const key in charts) {
    if (charts[key]) {
        charts[key].destroy();
        charts[key] = null;
    }
    }
}

inicializarDashboard(dadosApi);