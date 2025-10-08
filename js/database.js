// js/database.js
class Database {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.initializeAdmin();
    }

    initializeAdmin() {
        if (!this.users.find(u => u.username === "admin")) {
            const adminUser = {
                id: 1,
                username: "admin",
                password: "admin123",
                role: 'admin'
            };
            this.users.push(adminUser);
            this.saveUsers();
        }
    }

    getAdminUsername() {
        return window.appConfig?.adminUsername || 'admin';
    }

    getAdminPassword() {
        return window.appConfig?.adminPassword || 'admin123';
    }

    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    authenticate(username, password) {
        const user = this.users.find(u => 
            u.username === username && u.password === password
        );
        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        }
        return false;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    // Métodos para gestionar personas
    addPerson(person) {
        const people = this.getPeople();
        person.id = Date.now();
        person.fechaRegistro = new Date().toISOString();
        person.calificacionesDiarias = [];
        person.advertencias = [];
        person.advertenciasActivas = 0;
        person.promedio = '0.00';
        people.push(person);
        localStorage.setItem('people', JSON.stringify(people));
        return person;
    }

    getPeople() {
        return JSON.parse(localStorage.getItem('people')) || [];
    }

    // Sistema de advertencias
    addAdvertencia(personId, motivo, fecha = null) {
        const people = this.getPeople();
        const personIndex = people.findIndex(p => p.id === personId);
        
        if (personIndex === -1) return false;

        const advertencia = {
            id: Date.now(),
            fecha: fecha || new Date().toISOString().split('T')[0],
            motivo: motivo,
            activa: true
        };

        if (!people[personIndex].advertencias) {
            people[personIndex].advertencias = [];
        }

        people[personIndex].advertencias.push(advertencia);
        people[personIndex].advertenciasActivas = this.countAdvertenciasActivas(people[personIndex].advertencias);
        
        localStorage.setItem('people', JSON.stringify(people));
        return advertencia;
    }

    countAdvertenciasActivas(advertencias) {
        if (!advertencias) return 0;
        return advertencias.filter(adv => adv.activa).length;
    }

    // Quitar advertencia (marcar como inactiva)
    removeAdvertencia(personId, advertenciaId) {
        const people = this.getPeople();
        const personIndex = people.findIndex(p => p.id === personId);
        
        if (personIndex === -1) return false;

        const advertenciaIndex = people[personIndex].advertencias.findIndex(
            adv => adv.id === advertenciaId
        );

        if (advertenciaIndex === -1) return false;

        people[personIndex].advertencias[advertenciaIndex].activa = false;
        people[personIndex].advertenciasActivas = this.countAdvertenciasActivas(people[personIndex].advertencias);
        
        localStorage.setItem('people', JSON.stringify(people));
        return true;
    }

    // Reactivar advertencia
    reactivarAdvertencia(personId, advertenciaId) {
        const people = this.getPeople();
        const personIndex = people.findIndex(p => p.id === personId);
        
        if (personIndex === -1) return false;

        const advertenciaIndex = people[personIndex].advertencias.findIndex(
            adv => adv.id === advertenciaId
        );

        if (advertenciaIndex === -1) return false;

        people[personIndex].advertencias[advertenciaIndex].activa = true;
        people[personIndex].advertenciasActivas = this.countAdvertenciasActivas(people[personIndex].advertencias);
        
        localStorage.setItem('people', JSON.stringify(people));
        return true;
    }

    // Obtener advertencias de una persona
    getAdvertencias(personId) {
        const people = this.getPeople();
        const person = people.find(p => p.id === personId);
        return person ? (person.advertencias || []) : [];
    }

    // Calificaciones diarias (código existente)
    addDailyScore(personId, scores, fecha = null) {
        const people = this.getPeople();
        const personIndex = people.findIndex(p => p.id === personId);
        
        if (personIndex === -1) return false;

        const fechaCalificacion = fecha || new Date().toISOString().split('T')[0];
        
        const existingIndex = people[personIndex].calificacionesDiarias.findIndex(
            cal => cal.fecha === fechaCalificacion
        );

        const dailyScore = {
            id: Date.now(),
            fecha: fechaCalificacion,
            scores: scores,
            promedio: this.calculateAverage(scores)
        };

        if (!people[personIndex].calificacionesDiarias) {
            people[personIndex].calificacionesDiarias = [];
        }

        if (existingIndex !== -1) {
            people[personIndex].calificacionesDiarias[existingIndex] = dailyScore;
        } else {
            people[personIndex].calificacionesDiarias.push(dailyScore);
        }

        people[personIndex].calificacionesDiarias.sort((a, b) => 
            new Date(b.fecha) - new Date(a.fecha)
        );

        people[personIndex].promedio = this.calculateGeneralAverage(people[personIndex].calificacionesDiarias);
        
        localStorage.setItem('people', JSON.stringify(people));
        return true;
    }

    getDailyScores(personId) {
        const people = this.getPeople();
        const person = people.find(p => p.id === personId);
        return person ? (person.calificacionesDiarias || []) : [];
    }

    getAllScoresByDate(fecha = null) {
        const people = this.getPeople();
        const fechaBusqueda = fecha || new Date().toISOString().split('T')[0];
        
        const resultados = [];
        
        people.forEach(person => {
            const calificacionDelDia = person.calificacionesDiarias.find(
                cal => cal.fecha === fechaBusqueda
            );
            
            if (calificacionDelDia) {
                resultados.push({
                    persona: person,
                    calificacion: calificacionDelDia
                });
            }
        });

        return resultados;
    }

    getDateRange() {
        const people = this.getPeople();
        const fechas = new Set();
        
        people.forEach(person => {
            person.calificacionesDiarias.forEach(cal => {
                fechas.add(cal.fecha);
            });
        });
        
        return Array.from(fechas).sort((a, b) => new Date(b) - new Date(a));
    }

    calculateGeneralAverage(calificacionesDiarias) {
        if (!calificacionesDiarias || calificacionesDiarias.length === 0) {
            return '0.00';
        }

        let totalPromedio = 0;
        calificacionesDiarias.forEach(calificacion => {
            totalPromedio += parseFloat(calificacion.promedio);
        });

        return (totalPromedio / calificacionesDiarias.length).toFixed(2);
    }

    calculateAverage(scores) {
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

    updatePerson(id, updatedPerson) {
        const people = this.getPeople();
        const index = people.findIndex(p => p.id === id);
        if (index !== -1) {
            const calificacionesDiarias = people[index].calificacionesDiarias || [];
            const advertencias = people[index].advertencias || [];
            people[index] = { 
                ...people[index], 
                ...updatedPerson,
                id: people[index].id,
                calificacionesDiarias: calificacionesDiarias,
                advertencias: advertencias,
                advertenciasActivas: people[index].advertenciasActivas || 0
            };
            localStorage.setItem('people', JSON.stringify(people));
            return true;
        }
        return false;
    }

    deletePerson(id) {
        const people = this.getPeople();
        const filteredPeople = people.filter(p => p.id !== id);
        localStorage.setItem('people', JSON.stringify(filteredPeople));
        return true;
    }
}