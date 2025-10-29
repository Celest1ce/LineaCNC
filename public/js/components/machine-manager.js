/**
 * Gestionnaire des machines CNC
 */
class MachineManager {
    constructor() {
        this.machines = new Map();
        this.ports = new Map();
        this.currentEditingMachine = null;
        this.currentConsoleMachine = null;
        this.readers = new Map(); // Pour stocker les readers Web Serial
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateDisplay();
        // Charger les machines sauvegardées depuis la BDD
        this.loadMachinesFromDB();
    }

    bindEvents() {
        const addMachineBtn = document.getElementById('addMachineBtn');
        const modal = document.getElementById('machineModal');
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const form = document.getElementById('machineForm');
        const consoleModal = document.getElementById('consoleModal');
        const closeConsoleModal = document.getElementById('closeConsoleModal');
        const sendConsoleBtn = document.getElementById('sendConsoleBtn');
        const consoleInput = document.getElementById('consoleInput');

        if (addMachineBtn) {
            addMachineBtn.addEventListener('click', () => this.addMachine());
        }
        if (closeModal) {
            closeModal.addEventListener('click', () => this.hideModal());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideModal());
        }
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Fermer la modal en cliquant à l'extérieur
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }

        // Console modal events
        if (closeConsoleModal) {
            closeConsoleModal.addEventListener('click', () => this.hideConsoleModal());
        }
        if (consoleModal) {
            consoleModal.addEventListener('click', (e) => {
                if (e.target === consoleModal) {
                    this.hideConsoleModal();
                }
            });
        }
        if (sendConsoleBtn) {
            sendConsoleBtn.addEventListener('click', () => this.sendConsoleCommand());
        }
        if (consoleInput) {
            // Ctrl+Enter pour envoyer
            consoleInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    this.sendConsoleCommand();
                }
            });
        }
    }

    showModal(machineId) {
        if (!machineId || !this.machines.has(machineId)) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }

        this.currentEditingMachine = machineId;
        const modal = document.getElementById('machineModal');
        const nameInput = document.getElementById('machineName');
        const baudRateSelect = document.getElementById('machineBaudRate');

        const machine = this.machines.get(machineId);
        nameInput.value = machine.name;
        baudRateSelect.value = machine.baudRate;

        modal.classList.remove('hidden');
        nameInput.focus();
    }

    hideModal() {
        const modal = document.getElementById('machineModal');
        modal.classList.add('hidden');
        this.currentEditingMachine = null;
    }

    showConsoleModal(machineId) {
        if (!machineId || !this.machines.has(machineId)) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }

        const machine = this.machines.get(machineId);
        
        if (!machine.isConnected) {
            notificationManager.show('La machine doit être connectée pour ouvrir la console', 'error');
            return;
        }

        this.currentConsoleMachine = machineId;
        const modal = document.getElementById('consoleModal');
        const consoleOutput = document.getElementById('consoleOutput');
        const consoleInput = document.getElementById('consoleInput');

        // Vider la console
        consoleOutput.innerHTML = '<div class="text-gray-500">Console ouverte. En attente de données...</div>';

        modal.classList.remove('hidden');
        consoleInput.focus();

        // Démarrer la lecture des données
        this.startReadingSerial(machineId);
    }

    async hideConsoleModal() {
        const modal = document.getElementById('consoleModal');
        modal.classList.add('hidden');
        
        // Arrêter la lecture si une machine était en cours
        if (this.currentConsoleMachine) {
            await this.stopReadingSerial(this.currentConsoleMachine);
            this.currentConsoleMachine = null;
        }
    }

    async sendConsoleCommand() {
        const consoleInput = document.getElementById('consoleInput');
        const command = consoleInput.value.trim();

        if (!command) return;

        if (!this.currentConsoleMachine) {
            notificationManager.show('Aucune machine sélectionnée', 'error');
            return;
        }

        const machine = this.machines.get(this.currentConsoleMachine);
        if (!machine || !machine.isConnected) {
            notificationManager.show('Machine non connectée', 'error');
            return;
        }

        try {
            // Ajouter la commande à la console
            this.appendToConsole(`> ${command}`, 'text-blue-400');
            
            // Encoder et envoyer via Web Serial
            const encoder = new TextEncoder();
            const writer = machine.port.writable.getWriter();
            await writer.write(encoder.encode(command + '\n'));
            writer.releaseLock();

            // Vider le champ de saisie
            consoleInput.value = '';
        } catch (error) {
            console.error('Erreur lors de l\'envoi:', error);
            this.appendToConsole(`[Erreur] ${error.message}`, 'text-red-400');
            notificationManager.show('Erreur lors de l\'envoi de la commande', 'error');
        }
    }

    appendToConsole(text, colorClass = 'text-green-400') {
        const consoleOutput = document.getElementById('consoleOutput');
        const div = document.createElement('div');
        div.className = colorClass;
        div.textContent = text;
        consoleOutput.appendChild(div);
        
        // Auto-scroll vers le bas
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    async startReadingSerial(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.port) return;

        try {
            // Vérifier si un reader existe déjà
            if (this.readers.has(machineId)) {
                console.log('Reader déjà actif pour cette machine');
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            // Créer le reader et le stocker
            const reader = machine.port.readable.getReader();
            this.readers.set(machineId, reader);

            // Fonction pour lire les données
            const readLoop = async () => {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        
                        if (done) {
                            console.log('Lecture terminée');
                            break;
                        }

                        // Décoder les données
                        buffer += decoder.decode(value, { stream: true });
                        
                        // Traiter ligne par ligne
                        const lines = buffer.split('\n');
                        buffer = lines.pop(); // Garder la dernière ligne incomplète
                        
                        for (const line of lines) {
                            if (line.trim()) {
                                this.appendToConsole(line.trim());
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la lecture:', error);
                    this.appendToConsole(`[Erreur lecture] ${error.message}`, 'text-red-400');
                } finally {
                    reader.releaseLock();
                    this.readers.delete(machineId);
                }
            };

            // Démarrer la lecture
            readLoop();

        } catch (error) {
            console.error('Erreur lors du démarrage de la lecture:', error);
            this.appendToConsole(`[Erreur] ${error.message}`, 'text-red-400');
            // Nettoyer en cas d'erreur
            this.readers.delete(machineId);
        }
    }

    async stopReadingSerial(machineId) {
        if (this.readers.has(machineId)) {
            const reader = this.readers.get(machineId);
            if (reader) {
                try {
                    await reader.cancel();
                    reader.releaseLock();
                } catch (error) {
                    console.error('Erreur lors de l\'arrêt de la lecture:', error);
                }
            }
            this.readers.delete(machineId);
            this.appendToConsole('[Console fermée]', 'text-gray-500');
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('machineName').value.trim();
        const baudRate = parseInt(document.getElementById('machineBaudRate').value);

        if (!name) {
            notificationManager.show('Le nom de la machine est requis', 'error');
            return;
        }

        // Modifier une machine existante
        await this.updateMachine(this.currentEditingMachine, name, baudRate);
        this.hideModal();
    }

    async addMachine() {
        try {
            // Vérifier si l'API Web Serial est supportée
            if (!('serial' in navigator)) {
                notificationManager.show('Web Serial API non supportée par ce navigateur', 'error');
                return;
            }

            // Demander l'accès aux ports série
            const port = await navigator.serial.requestPort();
            
            // Ouvrir le port avec baud rate par défaut
            await port.open({ baudRate: 115200 });
            
            // Générer un ID unique pour la machine
            const machineId = 'machine_' + Date.now();
            
            // Créer l'objet machine avec paramètres par défaut
            const machine = {
                id: machineId,
                name: `Machine ${this.machines.size + 1}`,
                port: port,
                status: 'connecting',
                lastSeen: new Date(),
                baudRate: 115200,
                isConnected: false,
                uuid: null
            };

            // Ajouter à la liste
            this.machines.set(machineId, machine);
            this.ports.set(machineId, port);

            // Mettre à jour l'affichage
            this.updateDisplay();

            // Simuler la connexion et demander l'UUID
            setTimeout(async () => {
                machine.status = 'connected';
                machine.isConnected = true;
                machine.lastSeen = new Date();
                
                // Envoyer la commande M990 pour obtenir l'UUID
                await this.sendCommandAndParseUUID(machineId);
                
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} connectée`, 'success');
            }, 2000);

        } catch (error) {
            console.error('Erreur lors de l\'ajout de la machine:', error);
            if (error.name === 'NotAllowedError') {
                notificationManager.show('Accès au port série refusé', 'error');
            } else if (error.name === 'NotFoundError') {
                notificationManager.show('Aucun port série trouvé', 'error');
            } else {
                notificationManager.show('Erreur: Impossible d\'ajouter la machine', 'error');
            }
        }
    }

    async sendCommandAndParseUUID(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.port) return;

        try {
            // Envoyer la commande M990
            const encoder = new TextEncoder();
            const writer = machine.port.writable.getWriter();
            await writer.write(encoder.encode('M990\n'));
            writer.releaseLock();

            // Lire la réponse avec timeout
            const decoder = new TextDecoder();
            const reader = machine.port.readable.getReader();
            let buffer = '';
            let lines = [];
            let timeoutId;
            
            // Créer une promesse avec timeout
            const readPromise = new Promise(async (resolve, reject) => {
                timeoutId = setTimeout(() => {
                    reader.cancel();
                    reject(new Error('Timeout lors de la lecture de l\'UUID'));
                }, 5000); // 5 secondes timeout
                
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        
                        if (done) {
                            clearTimeout(timeoutId);
                            resolve(lines);
                            break;
                        }
                        
                        buffer += decoder.decode(value, { stream: true });
                        const tempLines = buffer.split('\n');
                        buffer = tempLines.pop() || '';
                        
                        lines.push(...tempLines);
                        
                        // Vérifier si on a reçu "ok"
                        if (lines.some(line => line.trim().toLowerCase() === 'ok')) {
                            clearTimeout(timeoutId);
                            resolve(lines);
                            break;
                        }
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });

            await readPromise;
            reader.releaseLock();

            // Parser l'UUID de la réponse
            // Format attendu: "Firmware Build UUID:\nbc140b75-8e0f-4f49-9723-268f574c5df3\nok"
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // UUID Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(line)) {
                    machine.uuid = line;
                    console.log('UUID trouvé:', line);
                    
                    // Sauvegarder la machine en BDD
                    await this.saveMachineToDB(machine);
                    break;
                }
            }

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'UUID:', error);
            // Ne pas bloquer l'ajout de la machine si l'UUID ne peut pas être récupéré
        }
    }

    async saveMachineToDB(machine) {
        try {
            const portInfo = machine.port.getInfo();
            const portName = portInfo.usbProductId ? `COM${portInfo.usbProductId}` : 'unknown';
            
            const response = await fetch('/api/machines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uuid: machine.uuid,
                    name: machine.name,
                    baudRate: machine.baudRate,
                    port: portName
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Machine sauvegardée en BDD:', machine.uuid);
            }
        } catch (error) {
            console.error('Erreur sauvegarde machine en BDD:', error);
        }
    }

    async updatePortInDB(machine) {
        try {
            const portInfo = machine.port.getInfo();
            const portName = portInfo.usbProductId ? `COM${portInfo.usbProductId}` : 'unknown';
            
            const response = await fetch('/api/machines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uuid: machine.uuid,
                    name: machine.name,
                    baudRate: machine.baudRate,
                    port: portName
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Port COM mis à jour en BDD:', portName);
            }
        } catch (error) {
            console.error('Erreur mise à jour port COM en BDD:', error);
        }
    }

    async loadMachinesFromDB() {
        try {
            const response = await fetch('/api/machines');
            const machines = await response.json();
            
            console.log('Machines chargées depuis la BDD:', machines);
            
            // Tenter de se reconnecter automatiquement aux machines
            for (const dbMachine of machines) {
                await this.tryReconnectMachine(dbMachine);
            }
        } catch (error) {
            console.error('Erreur chargement machines depuis BDD:', error);
        }
    }

    async tryReconnectMachine(dbMachine) {
        try {
            // Vérifier si l'API Web Serial est supportée
            if (!('serial' in navigator)) {
                return;
            }

            // Demander l'accès aux ports série
            const ports = await navigator.serial.getPorts();
            
            // Chercher le port correspondant au dernier port utilisé
            let targetPort = null;
            if (dbMachine.last_port) {
                // Essayer de trouver le port par son nom
                for (const port of ports) {
                    const info = port.getInfo();
                    const portName = info.usbProductId ? `COM${info.usbProductId}` : 'unknown';
                    if (portName === dbMachine.last_port) {
                        targetPort = port;
                        break;
                    }
                }
            }

            // Si aucun port correspondant, prendre le premier disponible
            if (!targetPort && ports.length > 0) {
                targetPort = ports[0];
            }

            if (!targetPort) {
                console.log('Aucun port disponible pour', dbMachine.name);
                return;
            }

            // Ouvrir le port
            await targetPort.open({ baudRate: dbMachine.baud_rate });
            
            // Générer un ID unique pour la machine
            const machineId = 'machine_' + Date.now();
            
            // Créer l'objet machine
            const machine = {
                id: machineId,
                name: dbMachine.name,
                port: targetPort,
                status: 'connecting',
                lastSeen: new Date(),
                baudRate: dbMachine.baud_rate,
                isConnected: false,
                uuid: dbMachine.uuid
            };

            // Ajouter à la liste
            this.machines.set(machineId, machine);
            this.ports.set(machineId, targetPort);

            // Mettre à jour l'affichage
            this.updateDisplay();

            // Simuler la connexion
            setTimeout(async () => {
                machine.status = 'connected';
                machine.isConnected = true;
                machine.lastSeen = new Date();
                
                // Mettre à jour le port COM dans la BDD
                if (machine.uuid) {
                    await this.updatePortInDB(machine);
                }
                
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} reconnectée automatiquement`, 'success');
            }, 2000);

        } catch (error) {
            console.error('Erreur reconnexion automatique:', error);
        }
    }

    async updateMachine(machineId, name, baudRate) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        machine.name = name;
        machine.baudRate = baudRate;
        
        // Si la machine est connectée, fermer et rouvrir avec le nouveau baud rate
        if (machine.isConnected) {
            try {
                machine.port.close();
                await machine.port.open({ baudRate: baudRate });
                notificationManager.show(`Machine ${name} mise à jour`, 'success');
            } catch (error) {
                machine.status = 'error';
                notificationManager.show('Erreur lors de la mise à jour', 'error');
            }
        }

        this.updateDisplay();
    }

    async disconnectMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        try {
            // Arrêter la lecture si un reader est actif
            if (this.readers.has(machineId)) {
                await this.stopReadingSerial(machineId);
            }

            // Fermer le port
            await machine.port.close();
            
            // Mettre à jour le port COM dans la BDD
            if (machine.uuid) {
                await this.updatePortInDB(machine);
            }
            
            machine.status = 'disconnected';
            machine.isConnected = false;
            this.updateDisplay();
            notificationManager.show(`Machine ${machine.name} déconnectée`, 'info');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            // En cas d'erreur, forcer la déconnexion
            machine.status = 'disconnected';
            machine.isConnected = false;
            this.updateDisplay();
            notificationManager.show(`Machine ${machine.name} déconnectée`, 'info');
        }
    }

    async reconnectMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        try {
            machine.status = 'connecting';
            this.updateDisplay();

            // Fermer le port s'il est ouvert
            try {
                if (machine.port && machine.port.readable && this.readers.has(machineId)) {
                    await this.stopReadingSerial(machineId);
                }
                await machine.port.close();
            } catch (error) {
                console.log('Port déjà fermé ou erreur lors de la fermeture:', error);
            }

            // Attendre un peu avant de rouvrir
            await new Promise(resolve => setTimeout(resolve, 500));

            // Rouvrir le port
            await machine.port.open({ baudRate: machine.baudRate });

            // Simuler la reconnexion
            setTimeout(async () => {
                machine.status = 'connected';
                machine.isConnected = true;
                machine.lastSeen = new Date();
                
                // Mettre à jour le port COM dans la BDD
                if (machine.uuid) {
                    await this.updatePortInDB(machine);
                }
                
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} reconnectée`, 'success');
            }, 2000);

        } catch (error) {
            console.error('Erreur de reconnexion:', error);
            machine.status = 'error';
            this.updateDisplay();
            notificationManager.show(`Erreur de reconnexion: ${machine.name}`, 'error');
        }
    }

    async removeMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        if (confirm(`Êtes-vous sûr de vouloir supprimer la machine "${machine.name}" ?`)) {
            try {
                // Arrêter la lecture si un reader est actif
                if (this.readers.has(machineId)) {
                    await this.stopReadingSerial(machineId);
                }

                // Fermer le port si connecté
                if (machine.isConnected && machine.port) {
                    await machine.port.close();
                }

                // Supprimer les références
                this.machines.delete(machineId);
                this.ports.delete(machineId);
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} supprimée`, 'info');
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                // Forcer la suppression même en cas d'erreur
                this.machines.delete(machineId);
                this.ports.delete(machineId);
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} supprimée`, 'info');
            }
        }
    }

    updateDisplay() {
        const grid = document.getElementById('machinesGrid');
        const noMachinesMessage = document.getElementById('noMachinesMessage');

        if (!grid) return;

        // Vider la grille
        grid.innerHTML = '';

        if (this.machines.size === 0) {
            if (noMachinesMessage) {
                noMachinesMessage.classList.remove('hidden');
            }
            return;
        }

        if (noMachinesMessage) {
            noMachinesMessage.classList.add('hidden');
        }

        // Créer les tuiles pour chaque machine
        this.machines.forEach((machine, machineId) => {
            const tile = this.createMachineTile(machine);
            grid.appendChild(tile);
        });
    }

    createMachineTile(machine) {
        const tile = document.createElement('div');
        tile.className = 'card p-4 hover:shadow-lg transition-shadow duration-200';
        
        const statusColors = {
            'connected': 'text-green-600 bg-green-100',
            'connecting': 'text-yellow-600 bg-yellow-100',
            'disconnected': 'text-gray-600 bg-gray-100',
            'error': 'text-red-600 bg-red-100'
        };

        const statusTexts = {
            'connected': 'Connectée',
            'connecting': 'Connexion...',
            'disconnected': 'Déconnectée',
            'error': 'Erreur'
        };

        tile.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center space-x-2">
                    <div class="p-1.5 bg-blue-100 rounded-lg">
                        <svg class="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="text-sm font-semibold text-gray-900 truncate">${machine.name}</h3>
                        <p class="text-xs text-gray-500">${machine.baudRate} baud</p>
                    </div>
                </div>
                <div class="flex space-x-1">
                    <button 
                        onclick="machineManager.showModal('${machine.id}')"
                        class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Paramètres"
                    >
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </button>
                    ${machine.isConnected ? `
                    <button 
                        onclick="machineManager.showConsoleModal('${machine.id}')"
                        class="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Console Serial"
                    >
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </button>
                    ` : ''}
                    <button 
                        onclick="machineManager.removeMachine('${machine.id}')"
                        class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Supprimer"
                    >
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-gray-700">Statut:</span>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[machine.status]}">
                        ${statusTexts[machine.status]}
                    </span>
                </div>
                
                <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-gray-700">Activité:</span>
                    <span class="text-xs text-gray-500">${this.formatTime(machine.lastSeen)}</span>
                </div>
                
                ${machine.uuid ? `
                <div class="mt-2 pt-2 border-t border-gray-200">
                    <div class="bg-gray-100 rounded-lg px-2 py-1.5">
                        <div class="text-xs font-medium text-gray-600 mb-0.5">UUID Firmware</div>
                        <div class="text-xs font-mono text-gray-800 break-all">${machine.uuid}</div>
                    </div>
                </div>
                ` : ''}
            </div>

            ${machine.status === 'connected' ? `
                <div class="mt-3 pt-3 border-t border-gray-200">
                    <div class="flex space-x-2">
                        <button 
                            onclick="machineManager.disconnectMachine('${machine.id}')"
                            class="flex-1 btn-secondary text-xs py-1.5"
                        >
                            Déconnecter
                        </button>
                        <button class="flex-1 btn-primary text-xs py-1.5">
                            Contrôler
                        </button>
                    </div>
                </div>
            ` : machine.status === 'disconnected' ? `
                <div class="mt-3 pt-3 border-t border-gray-200">
                    <button 
                        onclick="machineManager.reconnectMachine('${machine.id}')"
                        class="w-full btn-primary text-xs py-1.5"
                    >
                        Reconnecter
                    </button>
                </div>
            ` : ''}
        `;

        return tile;
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes}min`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Il y a ${hours}h`;
        
        return date.toLocaleDateString('fr-FR');
    }
}
