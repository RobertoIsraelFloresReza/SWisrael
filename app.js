document.addEventListener('DOMContentLoaded', () => {
    const logList = document.getElementById('log-list');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const logCount = document.getElementById('log-count');
    const eventCount = document.getElementById('event-count');
    const lastUpdate = document.getElementById('last-update');
    const clearLogsBtn = document.getElementById('clear-logs');
    const toggleIdleBtn = document.getElementById('toggle-idle');
    
    let isCurrentlyActive = false;
    let idleInterval = null;
    let idleLoggingEnabled = true;
    let logEntries = 0;

    // Función para formatear la fecha
    const formatDate = (date) => {
        return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}:${date.getMilliseconds().toString().padStart(3, '0')}`;
    };

    // Función para actualizar el estado
    const updateStatus = (status, text) => {
        statusIndicator.className = 'status-indicator';
        if (status === 'active') {
            statusIndicator.classList.add('active');
        }
        statusText.textContent = text;
    };

    // Función para actualizar el contador
    const updateCounters = () => {
        logCount.textContent = logEntries;
        eventCount.textContent = `${logEntries} evento${logEntries !== 1 ? 's' : ''}`;
        lastUpdate.textContent = new Date().toLocaleTimeString();
    };

    // Función para agregar una entrada al log
    const addLogEntry = (name, status) => {
        const date = new Date();
        const formattedDate = formatDate(date);
        
        // Determinar el ícono según el estado
        let icon = '📝';
        switch(status) {
            case 'active': icon = '✅'; break;
            case 'registered': icon = '📋'; break;
            case 'installed': icon = '🔧'; break;
            case 'activating': icon = '⚡'; break;
            case 'fetching': icon = '🌐'; break;
            case 'idle': icon = '💤'; break;
            case 'error': icon = '❌'; break;
        }
        
        const listItem = document.createElement('li');
        listItem.className = 'fade-in';
        listItem.innerHTML = `
            <span class="event-icon">${icon}</span>
            <div class="event-details">
                <span class="event-name">${name}</span>
                <span class="event-date">${formattedDate}</span>
            </div>
            <span class="event-status status-${status}">${status}</span>
        `;
        
        // Insertar al principio de la lista
        logList.insertBefore(listItem, logList.firstChild);
        
        // Actualizar contadores
        logEntries++;
        updateCounters();
        
        // Scroll al inicio para ver la nueva entrada
        logList.scrollTop = 0;
    };

    // Función para iniciar el logging de estado ocioso
    const startIdleLogging = () => {
        if (!idleInterval && idleLoggingEnabled) {
            addLogEntry('Ocioso', 'idle');
            idleInterval = setInterval(() => {
                addLogEntry('Ocioso', 'idle');
            }, 3000);
        }
    };

    // Función para detener el logging de estado ocioso
    const stopIdleLogging = () => {
        if (idleInterval) {
            clearInterval(idleInterval);
            idleInterval = null;
        }
    };

    // Función para alternar el logging ocioso
    const toggleIdleLogging = () => {
        idleLoggingEnabled = !idleLoggingEnabled;
        toggleIdleBtn.textContent = idleLoggingEnabled ? 
            'Desactivar Log Ocioso' : 'Activar Log Ocioso';
        
        if (idleLoggingEnabled && !isCurrentlyActive) {
            startIdleLogging();
        } else {
            stopIdleLogging();
        }
    };

    // Función para limpiar la bitácora
    const clearLogs = () => {
        logList.innerHTML = '';
        logEntries = 0;
        updateCounters();
    };

    // Event listeners para los botones
    clearLogsBtn.addEventListener('click', clearLogs);
    toggleIdleBtn.addEventListener('click', toggleIdleLogging);

    // Verificar si el navegador soporta Service Workers
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { scope: '/SWisrael' })
                .then(registration => {
                    console.log('Service Worker registrado con éxito:', registration);
                    addLogEntry('Registrado', 'registered');
                    updateStatus('registered', 'Registrado');
                    
                    if (navigator.serviceWorker.controller) {
                        if (!isCurrentlyActive) {
                            addLogEntry('Activo', 'active');
                            updateStatus('active', 'Activo');
                            isCurrentlyActive = true;
                        }
                    }

                    registration.addEventListener('updatefound', () => {
                        const newSW = registration.installing;
                        if (newSW) {
                            addLogEntry('Instalado/wait', 'installed');
                        }
                    });
                })
                .catch(error => {
                    console.error('Fallo el registro del Service Worker:', error);
                    addLogEntry('Error de registro', 'error');
                    updateStatus('error', 'Error de registro');
                });

            // Escuchar mensajes del Service Worker
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && event.data.type === 'LOG_EVENT') {
                    const eventStatus = event.data.status;
                    const eventName = event.data.name;

                    if (eventStatus === 'installed' || eventStatus === 'activating' || eventStatus === 'fetching') {
                        addLogEntry(eventName, eventStatus);
                        updateStatus(eventStatus, eventName);
                        isCurrentlyActive = (navigator.serviceWorker.controller && navigator.serviceWorker.controller.state === 'activated');
                        stopIdleLogging();
                    } else if (eventStatus === 'registered') {
                        addLogEntry(eventName, eventStatus);
                        updateStatus(eventStatus, eventName);
                    }
                }
            });

            // Escuchar cambios en el controlador
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (navigator.serviceWorker.controller && !isCurrentlyActive) {
                    addLogEntry('Activo', 'active');
                    updateStatus('active', 'Activo');
                    isCurrentlyActive = true;
                    stopIdleLogging();
                }
            });
            
            // Verificar periódicamente el estado del Service Worker
            setInterval(() => {
                const controller = navigator.serviceWorker.controller;
                if (!controller && isCurrentlyActive) {
                    startIdleLogging();
                    updateStatus('idle', 'Ocioso');
                    isCurrentlyActive = false;
                } else if (controller && !isCurrentlyActive) {
                    addLogEntry('Activo', 'active');
                    updateStatus('active', 'Activo');
                    isCurrentlyActive = true;
                    stopIdleLogging();
                }
            }, 3000);
        });
    } else {
        console.log('El navegador no soporta Service Workers');
        addLogEntry('Navegador no compatible', 'error');
        updateStatus('error', 'No compatible');
    }
    
    // Inicializar contadores
    updateCounters();
});