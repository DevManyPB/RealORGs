// js/dashboard.js
let currentPersonId = null;

function initDashboard() {
    if (!db.currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    loadPeopleTable();
    setupEventListeners();
    updateStats();
}

function setupEventListeners() {
    // Formulario de agregar persona
    const personForm = document.getElementById('personForm');
    if (personForm) {
        personForm.addEventListener('submit', handleAddPerson);
    }

    // Búsqueda y filtros
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', handleSearch);

    const filterRango = document.getElementById('filterRango');
    const filterStatus = document.getElementById('filterStatus');
    if (filterRango) filterRango.addEventListener('change', handleFilter);
    if (filterStatus) filterStatus.addEventListener('change', handleFilter);

    // Modal de confirmación
    const confirmCancel = document.getElementById('confirmCancel');
    if (confirmCancel) confirmCancel.addEventListener('click', closeConfirmModal);
    
    // Modal de calificación diaria
    setupDailyScoreModal();
}

function handleSearch(e) {
    filterAndDisplayPeople();
}

function handleFilter() {
    filterAndDisplayPeople();
}

function filterAndDisplayPeople() {
    const people = db.getPeople();
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const rangoFilter = document.getElementById('filterRango') ? document.getElementById('filterRango').value : '';
    const statusFilter = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : '';

    const filteredPeople = people.filter(person => {
        const matchesSearch = !searchTerm || 
            person.nombre.toLowerCase().includes(searchTerm);
        
        const matchesRango = !rangoFilter || person.rango === rangoFilter;
        
        const status = getStatus(person.promedio);
        const matchesStatus = !statusFilter || status.text.toLowerCase() === statusFilter;

        return matchesSearch && matchesRango && matchesStatus;
    });

    displayPeople(filteredPeople);
}

function displayPeople(people) {
    const tableBody = document.getElementById('peopleTableBody');
    const noResults = document.getElementById('noResults');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (people.length === 0) {
        if (noResults) noResults.style.display = 'block';
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    
    people.forEach(person => {
        const status = getStatus(person.promedio);
        const hasDailyScores = person.calificacionesDiarias && person.calificacionesDiarias.length > 0;
        const ultimaCalificacion = hasDailyScores ? 
            formatDate(person.calificacionesDiarias[0].fecha) : 'Sin calificar';
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${person.nombre}</td>
            <td><span class="rango-badge">${person.rango}</span></td>
            <td>${formatDate(person.fecha)}</td>
            <td><strong>${person.promedio}</strong></td>
            <td><span class="status-badge ${status.class}">${status.text}</span></td>
            <td>${ultimaCalificacion}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-score" onclick="addDailyScore(${person.id})" title="Agregar Calificación Diaria">
                        <i class="fas fa-calendar-plus"></i>
                    </button>
                    ${hasDailyScores ? `
                    <button class="btn-action btn-history" onclick="viewHistory(${person.id})" title="Ver Historial">
                        <i class="fas fa-history"></i>
                    </button>
                    ` : ''}
                    <button class="btn-action btn-delete" onclick="confirmDelete(${person.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function loadPeopleTable() {
    filterAndDisplayPeople();
}

function updateStats() {
    const people = db.getPeople();
    const totalPeople = people.length;
    
    let totalScore = 0;
    let totalScoresToday = 0;
    const today = new Date().toISOString().split('T')[0];
    
    people.forEach(person => {
        totalScore += parseFloat(person.promedio);
        
        // Contar calificaciones de hoy
        if (person.calificacionesDiarias) {
            const hasScoreToday = person.calificacionesDiarias.some(
                cal => cal.fecha === today
            );
            if (hasScoreToday) totalScoresToday++;
        }
    });
    
    const avgScore = totalPeople > 0 ? (totalScore / totalPeople).toFixed(2) : '0.00';
    
    document.getElementById('totalPeople').textContent = totalPeople;
    document.getElementById('avgScore').textContent = avgScore;
    document.getElementById('totalScores').textContent = totalScoresToday;
}

function handleAddPerson(e) {
    e.preventDefault();
    
    const person = {
        nombre: document.getElementById('nombre').value,
        rango: document.getElementById('rango').value,
        fecha: document.getElementById('fecha').value
    };

    db.addPerson(person);
    loadPeopleTable();
    updateStats();
    e.target.reset();
    
    showToast('Persona agregada exitosamente', 'success');
}

// Sistema de calificaciones diarias
function setupDailyScoreModal() {
    const dailyScoreForm = document.getElementById('dailyScoreForm');
    if (dailyScoreForm) {
        dailyScoreForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const scores = {
                mentorias: parseInt(document.getElementById('dailyMentorias').value),
                alineamiento: parseInt(document.getElementById('dailyAlineamiento').value),
                retencion: parseInt(document.getElementById('dailyRetencion').value),
                entrega: parseInt(document.getElementById('dailyEntrega').value),
                reclutamiento: parseInt(document.getElementById('dailyReclutamiento').value),
                retirar: parseInt(document.getElementById('dailyRetirar').value),
                eventos: parseInt(document.getElementById('dailyEventos').value)
            };

            const fecha = document.getElementById('dailyScoreFecha').value;

            if (db.addDailyScore(currentPersonId, scores, fecha)) {
                loadPeopleTable();
                updateStats();
                closeDailyScoreModal();
                showToast('Calificación diaria guardada exitosamente', 'success');
            } else {
                showToast('Error al guardar calificación', 'error');
            }
        });
    }
}

function addDailyScore(personId) {
    const people = db.getPeople();
    const person = people.find(p => p.id === personId);
    
    if (!person) {
        showToast('Persona no encontrada', 'error');
        return;
    }
    
    currentPersonId = personId;
    const today = new Date().toISOString().split('T')[0];
    
    // Llenar datos de la persona
    document.getElementById('dailyScorePerson').value = person.nombre;
    document.getElementById('dailyScoreFecha').value = today;
    
    // Buscar si ya existe calificación para hoy
    const calificacionHoy = person.calificacionesDiarias.find(
        cal => cal.fecha === today
    );
    
    // Si existe, cargar los valores
    if (calificacionHoy) {
        document.getElementById('dailyMentorias').value = calificacionHoy.scores.mentorias;
        document.getElementById('dailyAlineamiento').value = calificacionHoy.scores.alineamiento;
        document.getElementById('dailyRetencion').value = calificacionHoy.scores.retencion;
        document.getElementById('dailyEntrega').value = calificacionHoy.scores.entrega;
        document.getElementById('dailyReclutamiento').value = calificacionHoy.scores.reclutamiento;
        document.getElementById('dailyRetirar').value = calificacionHoy.scores.retirar;
        document.getElementById('dailyEventos').value = calificacionHoy.scores.eventos;
    } else {
        // Resetear valores
        document.getElementById('dailyScoreForm').reset();
        document.getElementById('dailyScoreFecha').value = today;
    }
    
    document.getElementById('dailyScoreModal').style.display = 'block';
}

function closeDailyScoreModal() {
    document.getElementById('dailyScoreModal').style.display = 'none';
    currentPersonId = null;
}

function viewHistory(personId) {
    currentPersonId = personId;
    const calificaciones = db.getDailyScores(personId);
    const people = db.getPeople();
    const person = people.find(p => p.id === personId);
    
    const historyList = document.getElementById('historyList');
    
    if (calificaciones.length === 0) {
        historyList.innerHTML = '<p class="no-history">No hay calificaciones registradas</p>';
    } else {
        historyList.innerHTML = `
            <div class="history-person-info">
                <h3>${person.nombre}</h3>
                <p class="person-rango">${person.rango}</p>
            </div>
            ${calificaciones.map(calificacion => `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-date">${formatDate(calificacion.fecha)}</span>
                    <span class="history-score">Promedio: ${calificacion.promedio}</span>
                </div>
                <div class="history-details">
                    <div class="score-detail">Mentorías: ${calificacion.scores.mentorias}</div>
                    <div class="score-detail">Alineamiento: ${calificacion.scores.alineamiento}</div>
                    <div class="score-detail">Retención: ${calificacion.scores.retencion}</div>
                    <div class="score-detail">Entrega: ${calificacion.scores.entrega}</div>
                    <div class="score-detail">Reclutamiento: ${calificacion.scores.reclutamiento}</div>
                    <div class="score-detail">Retirar Set: ${calificacion.scores.retirar}</div>
                    <div class="score-detail">Eventos: ${calificacion.scores.eventos}</div>
                </div>
            </div>
            `).join('')}
        `;
    }
    
    document.getElementById('historyModal').style.display = 'block';
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
    currentPersonId = null;
}

// Sistema de ver todas las calificaciones por fecha
function viewAllScores() {
    const fechas = db.getDateRange();
    const dateFilter = document.getElementById('scoreDateFilter');
    
    dateFilter.innerHTML = '';
    
    if (fechas.length === 0) {
        dateFilter.innerHTML = '<option value="">No hay calificaciones</option>';
    } else {
        fechas.forEach(fecha => {
            const option = document.createElement('option');
            option.value = fecha;
            option.textContent = formatDate(fecha);
            if (fecha === new Date().toISOString().split('T')[0]) {
                option.selected = true;
            }
            dateFilter.appendChild(option);
        });
    }
    
    dateFilter.addEventListener('change', loadScoresByDate);
    loadScoresByDate();
    document.getElementById('allScoresModal').style.display = 'block';
}

function loadScoresByDate() {
    const fechaSeleccionada = document.getElementById('scoreDateFilter').value;
    const resultados = db.getAllScoresByDate(fechaSeleccionada);
    const tableBody = document.getElementById('scoresTableBody');
    const noResults = document.getElementById('noScoresResults');
    
    tableBody.innerHTML = '';
    
    if (resultados.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    resultados.forEach(({ persona, calificacion }) => {
        const row = document.createElement('tr');
        const status = getStatus(calificacion.promedio);
        
        row.innerHTML = `
            <td>${persona.nombre}</td>
            <td><span class="rango-badge">${persona.rango}</span></td>
            <td>${calificacion.scores.mentorias}</td>
            <td>${calificacion.scores.alineamiento}</td>
            <td>${calificacion.scores.retencion}</td>
            <td>${calificacion.scores.entrega}</td>
            <td>${calificacion.scores.reclutamiento}</td>
            <td>${calificacion.scores.retirar}</td>
            <td>${calificacion.scores.eventos}</td>
            <td><span class="status-badge ${status.class}">${calificacion.promedio}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

function closeAllScoresModal() {
    document.getElementById('allScoresModal').style.display = 'none';
}

// Funciones de utilidad
function calculateAverage(scores) {
    const weights = {
        mentorias: 0.20,
        alineamiento: 0.15,
        retencion: 0.15,
        entrega: 0.15,
        reclutamiento: 0.15,
        retirar: 0.10,
        eventos: 0.10
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [criterion, score] of Object.entries(scores)) {
        weightedSum += score * weights[criterion];
        totalWeight += weights[criterion];
    }

    return (weightedSum / totalWeight).toFixed(2);
}

function getStatus(average) {
    const avg = parseFloat(average);
    if (avg >= 8) return { text: 'Excelente', class: 'status-excelente' };
    if (avg >= 6) return { text: 'Bueno', class: 'status-bueno' };
    return { text: 'Regular', class: 'status-regular' };
}

function formatDate(dateString) {
    try {
        if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Fecha inválida';
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error formateando fecha:', error, dateString);
        return dateString;
    }
}
// Sistema de confirmación
function showConfirmModal(title, message, onConfirm) {
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    
    const confirmBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    
    if (confirmBtn && cancelBtn) {
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        document.getElementById('confirmOk').onclick = function() {
            onConfirm();
            closeConfirmModal();
        };
        
        document.getElementById('confirmCancel').onclick = closeConfirmModal;
    }
    
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'block';
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'none';
}

function confirmDelete(id) {
    const people = db.getPeople();
    const person = people.find(p => p.id === id);
    if (!person) return;
    
    showConfirmModal(
        'Confirmar Eliminación',
        `¿Estás seguro de que quieres eliminar a "${person.nombre}"? Se perderán todas sus calificaciones.`,
        function() {
            db.deletePerson(id);
            loadPeopleTable();
            updateStats();
            showToast('Persona eliminada exitosamente', 'success');
        }
    );
}

// Sistema de notificaciones toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function addAdvertencia(personId) {
    const people = db.getPeople();
    const person = people.find(p => p.id === personId);
    
    if (!person) {
        showToast('Persona no encontrada', 'error');
        return;
    }
    
    currentPersonId = personId;
    const today = new Date().toISOString().split('T')[0];
    
    // Llenar datos de la persona
    document.getElementById('advertenciaPerson').value = person.nombre;
    document.getElementById('advertenciaFecha').value = today;
    document.getElementById('advertenciaMotivo').value = '';
    
    // Actualizar contador de advertencias
    updateAdvertenciaCount(person);
    
    document.getElementById('advertenciaModal').style.display = 'block';
}

function updateAdvertenciaCount(person) {
    const advertenciasActivas = person.advertenciasActivas || 0;
    const currentCount = document.getElementById('currentAdvertencias');
    const maxAlert = document.getElementById('advertenciaMaxAlert');
    const submitBtn = document.getElementById('advertenciaSubmit');
    
    currentCount.textContent = advertenciasActivas;
    currentCount.className = advertenciasActivas >= 3 ? 'max-warning' : '';
    
    if (advertenciasActivas >= 3) {
        maxAlert.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-ban"></i> Límite alcanzado';
    } else {
        maxAlert.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Agregar Advertencia';
    }
}

function closeAdvertenciaModal() {
    document.getElementById('advertenciaModal').style.display = 'none';
    currentPersonId = null;
}

function viewAdvertenciasHistory(personId) {
    currentPersonId = personId;
    const advertencias = db.getAdvertencias(personId);
    const people = db.getPeople();
    const person = people.find(p => p.id === personId);
    
    const advertenciasActivas = advertencias.filter(adv => adv.activa).length;
    const advertenciasInactivas = advertencias.filter(adv => !adv.activa).length;
    
    document.getElementById('totalAdvertenciasActivas').textContent = advertenciasActivas;
    document.getElementById('totalAdvertenciasInactivas').textContent = advertenciasInactivas;
    
    const historyList = document.getElementById('advertenciasHistoryList');
    
    if (advertencias.length === 0) {
        historyList.innerHTML = '<p class="no-history">No hay advertencias registradas</p>';
    } else {
        historyList.innerHTML = `
            <div class="history-person-info">
                <h3>${person.nombre}</h3>
                <p class="person-rango">${person.rango}</p>
            </div>
            ${advertencias.map(advertencia => `
            <div class="advertencia-item ${advertencia.activa ? 'active' : 'inactive'}">
                <div class="advertencia-header">
                    <span class="advertencia-date">${formatDate(advertencia.fecha)}</span>
                    <span class="advertencia-status ${advertencia.activa ? 'status-active' : 'status-inactive'}">
                        ${advertencia.activa ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
                <div class="advertencia-motivo">
                    <strong>Motivo:</strong> ${advertencia.motivo}
                </div>
                <div class="advertencia-actions">
                    ${advertencia.activa ? 
                        `<button class="btn-small btn-secondary" onclick="quitarAdvertencia(${personId}, ${advertencia.id})">
                            <i class="fas fa-times"></i> Quitar
                        </button>` :
                        `<button class="btn-small btn-warning" onclick="reactivarAdvertencia(${personId}, ${advertencia.id})">
                            <i class="fas fa-redo"></i> Reactivar
                        </button>`
                    }
                </div>
            </div>
            `).join('')}
        `;
    }
    
    document.getElementById('advertenciasHistoryModal').style.display = 'block';
}

function closeAdvertenciasHistoryModal() {
    document.getElementById('advertenciasHistoryModal').style.display = 'none';
    currentPersonId = null;
}

function quitarAdvertencia(personId, advertenciaId) {
    if (db.removeAdvertencia(personId, advertenciaId)) {
        loadPeopleTable();
        viewAdvertenciasHistory(personId); // Recargar el historial
        showToast('Advertencia quitada exitosamente', 'success');
    } else {
        showToast('Error al quitar advertencia', 'error');
    }
}

function reactivarAdvertencia(personId, advertenciaId) {
    const people = db.getPeople();
    const person = people.find(p => p.id === personId);
    
    if (person.advertenciasActivas >= 3) {
        showToast('No se puede reactivar: límite de 3 advertencias activas', 'error');
        return;
    }
    
    if (db.reactivarAdvertencia(personId, advertenciaId)) {
        loadPeopleTable();
        viewAdvertenciasHistory(personId);
        showToast('Advertencia reactivada exitosamente', 'success');
    } else {
        showToast('Error al reactivar advertencia', 'error');
    }
}

// Manejar el formulario de advertencia
document.addEventListener('DOMContentLoaded', function() {
    const advertenciaForm = document.getElementById('advertenciaForm');
    if (advertenciaForm) {
        advertenciaForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const motivo = document.getElementById('advertenciaMotivo').value;
            const fecha = document.getElementById('advertenciaFecha').value;

            if (db.addAdvertencia(currentPersonId, motivo, fecha)) {
                loadPeopleTable();
                closeAdvertenciaModal();
                showToast('Advertencia agregada exitosamente', 'warning');
            } else {
                showToast('Error al agregar advertencia', 'error');
            }
        });
    }
});

// Actualizar displayPeople para incluir advertencias
function displayPeople(people) {
    const tableBody = document.getElementById('peopleTableBody');
    const noResults = document.getElementById('noResults');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (people.length === 0) {
        if (noResults) noResults.style.display = 'block';
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    
    people.forEach(person => {
        const status = getStatus(person.promedio);
        const hasDailyScores = person.calificacionesDiarias && person.calificacionesDiarias.length > 0;
        const ultimaCalificacion = hasDailyScores ? 
            formatDate(person.calificacionesDiarias[0].fecha) : 'Sin calificar';
        
        const advertenciasActivas = person.advertenciasActivas || 0;
        const hasAdvertencias = person.advertencias && person.advertencias.length > 0;
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${person.nombre}</td>
            <td><span class="rango-badge">${person.rango}</span></td>
            <td>${formatDate(person.fecha)}</td>
            <td><strong>${person.promedio}</strong></td>
            <td><span class="status-badge ${status.class}">${status.text}</span></td>
            <td>
                <div class="advertencia-display">
                    <span class="advertencia-count ${advertenciasActivas >= 3 ? 'max-warning' : ''}">
                        ${advertenciasActivas}/3
                    </span>
                </div>
            </td>
            <td>${ultimaCalificacion}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-score" onclick="addDailyScore(${person.id})" title="Agregar Calificación Diaria">
                        <i class="fas fa-calendar-plus"></i>
                    </button>
                    <button class="btn-action btn-warning" onclick="addAdvertencia(${person.id})" title="Agregar Advertencia">
                        <i class="fas fa-exclamation-triangle"></i>
                    </button>
                    ${hasAdvertencias ? `
                    <button class="btn-action btn-history" onclick="viewAdvertenciasHistory(${person.id})" title="Ver Advertencias">
                        <i class="fas fa-clipboard-list"></i>
                    </button>
                    ` : ''}
                    ${hasDailyScores ? `
                    <button class="btn-action btn-history" onclick="viewHistory(${person.id})" title="Ver Calificaciones">
                        <i class="fas fa-history"></i>
                    </button>
                    ` : ''}
                    <button class="btn-action btn-delete" onclick="confirmDelete(${person.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}