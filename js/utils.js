// js/utils.js
// Utilidades adicionales

function exportToCSV() {
    const people = db.getPeople();
    let csv = 'Nombre,Rango,Fecha Ingreso,Nota Promedio,Estado\n';
    
    people.forEach(person => {
        const status = getStatus(person.promedio);
        csv += `"${person.nombre}","${person.rango}","${formatDate(person.fecha)}","${person.promedio}","${status.text}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'personas.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function filterByRango(rango) {
    const people = db.getPeople();
    const filtered = rango ? people.filter(p => p.rango === rango) : people;
    // Implementar lógica de filtrado en la tabla
}