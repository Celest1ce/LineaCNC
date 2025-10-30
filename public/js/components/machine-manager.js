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
        this.connectionMonitors = new Map(); // Pour stocker les monitors de connexion
        this.heartbeatIntervals = new Map(); // Pour stocker les intervalles de heartbeat
        this.commandHistory = []; // Historique des commandes
        this.historyIndex = -1; // Index actuel dans l'historique
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
            // Ne pas fermer la console en cliquant à l'extérieur
            // La console doit rester ouverte pour permettre la communication continue
            consoleModal.addEventListener('click', (e) => {
                // Ne rien faire - empêcher la fermeture accidentelle
            });
        }
        if (sendConsoleBtn) {
            sendConsoleBtn.addEventListener('click', () => this.sendConsoleCommand());
        }
        if (consoleInput) {
            // Gestion des touches clavier
            consoleInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    // Ctrl+Enter pour envoyer
                    e.preventDefault();
                    this.sendConsoleCommand();
                } else if (e.key === 'ArrowUp') {
                    // Flèche haut - commande précédente
                    e.preventDefault();
                    this.navigateHistory('up');
                } else if (e.key === 'ArrowDown') {
                    // Flèche bas - commande suivante
                    e.preventDefault();
                    this.navigateHistory('down');
                }
            });
        }

        // Gestion des préréglages de baudrate
        this.bindBaudrateEvents();
        
        // Test de la connexion automatique (à supprimer en production)
        console.log('MachineManager initialisé - Connexion automatique activée');
    }

    bindBaudrateEvents() {
        const dropdownBtn = document.getElementById('baudrateDropdownBtn');
        const dropdown = document.getElementById('baudrateDropdown');
        const baudrateInput = document.getElementById('machineBaudRate');

        // Toggle du dropdown
        if (dropdownBtn && dropdown) {
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleBaudrateDropdown();
            });
        }

        // Options du dropdown
        const optionButtons = document.querySelectorAll('.baudrate-option');
        optionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const baudrate = e.target.getAttribute('data-baudrate');
                this.selectBaudrateOption(baudrate);
            });
        });

        // Fermer le dropdown en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#baudrateDropdown') && !e.target.closest('#baudrateDropdownBtn')) {
                this.hideBaudrateDropdown();
            }
        });

        // Validation en temps réel de l'input
        if (baudrateInput) {
            baudrateInput.addEventListener('input', (e) => {
                this.validateBaudrateInput(e.target.value);
            });

            baudrateInput.addEventListener('blur', (e) => {
                this.validateBaudrateInput(e.target.value);
            });
        }
    }

    toggleBaudrateDropdown() {
        const dropdown = document.getElementById('baudrateDropdown');
        if (dropdown) {
            if (dropdown.classList.contains('hidden')) {
                this.showBaudrateDropdown();
            } else {
                this.hideBaudrateDropdown();
            }
        }
    }

    showBaudrateDropdown() {
        const dropdown = document.getElementById('baudrateDropdown');
        if (dropdown) {
            dropdown.classList.remove('hidden');
            dropdown.classList.add('show');
        }
    }

    hideBaudrateDropdown() {
        const dropdown = document.getElementById('baudrateDropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
            dropdown.classList.remove('show');
        }
    }

    selectBaudrateOption(baudrate) {
        const baudrateInput = document.getElementById('machineBaudRate');
        if (baudrateInput) {
            baudrateInput.value = baudrate;
            baudrateInput.focus();
        }
        
        // Fermer le dropdown
        this.hideBaudrateDropdown();
        
        // Validation
        this.validateBaudrateInput(baudrate);
    }

    validateBaudrateInput(value) {
        const baudrateInput = document.getElementById('machineBaudRate');
        if (!baudrateInput) return;

        const numValue = parseInt(value);
        
        // Validation
        if (isNaN(numValue) || numValue < 1200 || numValue > 20000000) {
            baudrateInput.style.borderColor = '#EF4444';
            baudrateInput.style.backgroundColor = '#FEF2F2';
        } else {
            baudrateInput.style.borderColor = '';
            baudrateInput.style.backgroundColor = '';
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

        // Initialiser les préréglages de baudrate
        this.initializeBaudratePresets(machine.baudRate);

        modal.classList.remove('hidden');
        nameInput.focus();
    }

    initializeBaudratePresets(currentBaudrate) {
        const baudrateInput = document.getElementById('machineBaudRate');
        if (baudrateInput) {
            baudrateInput.value = currentBaudrate;
            // Validation de la valeur initiale
            this.validateBaudrateInput(currentBaudrate);
        }
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
        consoleOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400">Console ouverte. En attente de données...</div>';

        // Réinitialiser l'historique pour cette nouvelle session
        this.historyIndex = -1;

        modal.classList.remove('hidden');
        consoleInput.focus();

        // Démarrer la lecture des données seulement si pas déjà active
        if (!this.readers.has(machineId)) {
        this.startReadingSerial(machineId);
        }
    }

    async hideConsoleModal() {
        const modal = document.getElementById('consoleModal');
        modal.classList.add('hidden');
        
        // Ne pas arrêter la lecture, juste fermer la console
        // La connexion doit rester active
        if (this.currentConsoleMachine) {
            this.currentConsoleMachine = null;
        }
    }

    /**
     * Arrêter seulement la lecture de console sans affecter la connexion
     */
    async stopConsoleReading(machineId) {
        if (this.readers.has(machineId)) {
            const reader = this.readers.get(machineId);
            if (reader) {
                try {
                    await reader.cancel();
                    reader.releaseLock();
                } catch (error) {
                    console.error('Erreur lors de l\'arrêt de la lecture console:', error);
                }
            }
            this.readers.delete(machineId);
            // Ne pas arrêter le monitoring de connexion
            // Ne pas afficher de message de fermeture
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
            // Ajouter la commande à l'historique
            this.addToHistory(command);
            
            // Ajouter la commande à la console
            this.appendToConsole(`> ${command}`, 'text-blue-400');
            
            // Encoder et envoyer via Web Serial
            const encoder = new TextEncoder();
            const writer = machine.port.writable.getWriter();
            await writer.write(encoder.encode(command + '\n'));
            writer.releaseLock();

            // Vider le champ de saisie et réinitialiser l'index
            consoleInput.value = '';
            this.historyIndex = -1;
        } catch (error) {
            console.error('Erreur lors de l\'envoi:', error);
            this.appendToConsole(`[Erreur] ${error.message}`, 'text-red-400');
            notificationManager.show('Erreur lors de l\'envoi de la commande', 'error');
        }
    }

    addToHistory(command) {
        // Éviter les doublons consécutifs
        if (this.commandHistory.length === 0 || this.commandHistory[this.commandHistory.length - 1] !== command) {
            this.commandHistory.push(command);
        }
        
        // Limiter l'historique à 100 commandes
        if (this.commandHistory.length > 100) {
            this.commandHistory.shift();
        }
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;

        const consoleInput = document.getElementById('consoleInput');
        
        if (direction === 'up') {
            // Flèche haut - commande précédente
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                consoleInput.value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
            }
        } else if (direction === 'down') {
            // Flèche bas - commande suivante
            if (this.historyIndex > 0) {
                this.historyIndex--;
                consoleInput.value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
            } else if (this.historyIndex === 0) {
                this.historyIndex = -1;
                consoleInput.value = '';
            }
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

            // Démarrer le monitoring de connexion (seulement si pas déjà actif)
            if (!this.connectionMonitors.has(machineId)) {
                this.startConnectionMonitoring(machineId);
            }

            // Fonction pour lire les données
            const readLoop = async () => {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        
                        if (done) {
                            console.log('Lecture terminée');
                            this.handleConnectionLost(machineId, 'Port fermé');
                            break;
                        }

                        // Décoder les données
                        buffer += decoder.decode(value, { stream: true });
                        
                        // Traiter ligne par ligne
                        const lines = buffer.split('\n');
                        buffer = lines.pop(); // Garder la dernière ligne incomplète
                        
                        for (const line of lines) {
                            if (line.trim()) {
                                // Afficher dans la console seulement si elle est ouverte
                                if (this.currentConsoleMachine === machineId) {
                                this.appendToConsole(line.trim());
                                }
                                // Mettre à jour lastSeen quand on reçoit des données
                                machine.lastSeen = new Date();
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la lecture:', error);
                    if (this.currentConsoleMachine === machineId) {
                    this.appendToConsole(`[Erreur lecture] ${error.message}`, 'text-red-400');
                    }
                    this.handleConnectionLost(machineId, error.message);
                } finally {
                    reader.releaseLock();
                    this.readers.delete(machineId);
                    // Ne pas arrêter le monitoring de connexion ici
                    // Il doit continuer même si la console est fermée
                }
            };

            // Démarrer la lecture
            readLoop();

        } catch (error) {
            console.error('Erreur lors du démarrage de la lecture:', error);
            if (this.currentConsoleMachine === machineId) {
            this.appendToConsole(`[Erreur] ${error.message}`, 'text-red-400');
            }
            // Nettoyer en cas d'erreur
            this.readers.delete(machineId);
            this.handleConnectionLost(machineId, error.message);
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
            // Ne pas arrêter le monitoring de connexion ici
            // Ne pas fermer le port, seulement arrêter la lecture
            // Afficher le message seulement si la console est ouverte
            if (this.currentConsoleMachine === machineId) {
            this.appendToConsole('[Console fermée]', 'text-gray-500 dark:text-gray-400');
            }
        }
    }

    /**
     * Démarrer le monitoring de connexion pour une machine
     */
    startConnectionMonitoring(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        // Arrêter le monitoring existant s'il y en a un
        this.stopConnectionMonitoring(machineId);

        // Démarrer le heartbeat
        const heartbeatInterval = setInterval(async () => {
            await this.checkConnectionHealth(machineId);
        }, 5000); // Vérifier toutes les 5 secondes

        this.heartbeatIntervals.set(machineId, heartbeatInterval);

        // Démarrer le monitoring de port
        const monitorInterval = setInterval(async () => {
            await this.checkPortStatus(machineId);
        }, 2000); // Vérifier le port toutes les 2 secondes

        this.connectionMonitors.set(machineId, monitorInterval);

        console.log(`Monitoring de connexion démarré pour ${machine.name}`);
    }

    /**
     * Arrêter le monitoring de connexion pour une machine
     */
    stopConnectionMonitoring(machineId) {
        // Arrêter le heartbeat
        if (this.heartbeatIntervals.has(machineId)) {
            clearInterval(this.heartbeatIntervals.get(machineId));
            this.heartbeatIntervals.delete(machineId);
        }

        // Arrêter le monitoring de port
        if (this.connectionMonitors.has(machineId)) {
            clearInterval(this.connectionMonitors.get(machineId));
            this.connectionMonitors.delete(machineId);
        }

        console.log(`Monitoring de connexion arrêté pour ${machineId}`);
    }

    /**
     * Vérifier la santé de la connexion
     */
    async checkConnectionHealth(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.isConnected) return;

        try {
            // Vérifier si le port est toujours accessible
            if (!machine.port || !machine.port.readable) {
                this.handleConnectionLost(machineId, 'Port non accessible');
                return;
            }

            // Vérifier si on n'a pas reçu de données depuis trop longtemps
            const now = new Date();
            const timeSinceLastSeen = now - machine.lastSeen;
            const maxSilenceTime = 30000; // 30 secondes

            if (timeSinceLastSeen > maxSilenceTime) {
                console.log(`Aucune donnée reçue depuis ${Math.round(timeSinceLastSeen / 1000)}s pour ${machine.name}`);
                // Ne pas déconnecter automatiquement, juste logger
            }

        } catch (error) {
            console.error('Erreur lors de la vérification de la connexion:', error);
            this.handleConnectionLost(machineId, error.message);
        }
    }

    /**
     * Vérifier le statut du port série
     */
    async checkPortStatus(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.isConnected) return;

        try {
            // Tenter d'accéder au port pour vérifier s'il est toujours disponible
            if (machine.port) {
                // Vérifier si le port est toujours ouvert
                if (!machine.port.readable) {
                    this.handleConnectionLost(machineId, 'Port fermé inattendu');
                    return;
                }
            }
        } catch (error) {
            // Si on ne peut pas accéder au port, c'est qu'il a été déconnecté
            console.error('Port inaccessible:', error);
            this.handleConnectionLost(machineId, 'Port déconnecté physiquement');
        }
    }

    /**
     * Gérer la perte de connexion
     */
    async handleConnectionLost(machineId, reason) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        console.log(`Connexion perdue pour ${machine.name}: ${reason}`);

        // Arrêter tous les monitoring
        this.stopConnectionMonitoring(machineId);
        
        // Arrêter la lecture si active
        if (this.readers.has(machineId)) {
            await this.stopReadingSerial(machineId);
        }

        // Fermer proprement le port et nettoyer les références
        if (machine.port) {
            try {
                // Essayer de fermer le port proprement
                if (machine.port.readable) {
                    // Si le port est encore ouvert, essayer de le fermer
                    try {
                        await machine.port.close();
                    } catch (closeError) {
                        console.log('Erreur lors de la fermeture du port:', closeError);
                        // Le port peut être déjà fermé ou dans un état invalide
                    }
                }
                
                // Attendre un peu pour s'assurer que le port est bien libéré
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Réinitialiser la référence du port pour forcer une nouvelle connexion
                machine.port = null;
                this.ports.delete(machineId);
            } catch (error) {
                console.error('Erreur lors du nettoyage du port:', error);
                // En cas d'erreur, réinitialiser quand même la référence
                machine.port = null;
                this.ports.delete(machineId);
            }
        }

        // Mettre à jour le statut
        machine.status = 'disconnected';
        machine.isConnected = false;
        machine.lastSeen = new Date();

        // Mettre à jour l'affichage
        this.updateDisplay();

        // Afficher une notification
        notificationManager.show(`Machine ${machine.name} déconnectée (${reason})`, 'warning');

        // Mettre à jour la base de données
        if (machine.uuid) {
            await this.updatePortInDB(machine);
        }

        // Ajouter un message dans la console si elle est ouverte
        if (this.currentConsoleMachine === machineId) {
            this.appendToConsole(`[Déconnexion] ${reason}`, 'text-red-400');
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
            
            // Ouvrir le port avec baud rate par défaut (115200)
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
                machine.status = 'retrieving';
                this.updateDisplay();
                
                // Récupérer l'UUID et le nom AVANT de démarrer la lecture en arrière-plan
                const detectedInfo = await this.getUUIDFromPort(port, false);
                
                if (detectedInfo) {
                    machine.uuid = detectedInfo.uuid;
                    if (detectedInfo.machineName) {
                        machine.name = detectedInfo.machineName;
                        console.log('Nom de machine détecté:', detectedInfo.machineName);
                    }
                    console.log('UUID trouvé:', detectedInfo.uuid);
                    
                    // Sauvegarder la machine en BDD
                    await this.saveMachineToDB(machine);
                }
                
                // Maintenant que l'UUID est récupéré, démarrer le monitoring et la lecture
                machine.status = 'ready';
                machine.isConnected = true;
                machine.lastSeen = new Date();
                
                // Démarrer le monitoring de connexion
                this.startConnectionMonitoring(machineId);
                
                // Démarrer la lecture en arrière-plan (après avoir libéré le reader)
                this.startReadingSerial(machineId);
                
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} prête`, 'success');
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
            if (!machine.port) {
                console.log('Port null, pas de mise à jour BDD');
                return;
            }
            
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
            // 1. Charger toutes les machines de la BDD
            const response = await fetch('/api/machines');
            const machines = await response.json();
            
            console.log('Machines chargées depuis la BDD:', machines);
            
            // 2. Récupérer les ports déjà autorisés
            let authorizedPorts = [];
            try {
                if ('serial' in navigator) {
                    authorizedPorts = await navigator.serial.getPorts();
                }
            } catch (error) {
                console.log('Aucun port autorisé trouvé:', error);
            }
            
            // 3. Créer les objets machine
            for (const dbMachine of machines) {
                // Générer un ID unique pour la machine (ou réutiliser si déjà existante)
                let machineId = null;
                
                // Chercher si cette machine existe déjà dans this.machines
                this.machines.forEach((machine, id) => {
                    if (machine.uuid === dbMachine.uuid) {
                        machineId = id;
                    }
                });
                
                // Si pas trouvée, créer un nouvel ID
                if (!machineId) {
                    machineId = 'machine_' + dbMachine.uuid.replace(/-/g, '_') + '_' + Date.now();
                }
                
                // Créer ou mettre à jour l'objet machine
                const machine = {
                    id: machineId,
                    uuid: dbMachine.uuid,
                    name: dbMachine.name,
                    port: null,
                    status: 'disconnected',
                    lastSeen: new Date(dbMachine.updated_at || dbMachine.created_at),
                    baudRate: dbMachine.baud_rate || 115200,
                    isConnected: false,
                    lastError: null,
                    needsAuthorization: false
                };
                
                // Ajouter à la liste (remplace si existant)
                this.machines.set(machineId, machine);
            }
            
            // 4. Marquer les machines qui ont besoin d'autorisation
            const authorizedPortIds = new Set();
            for (const port of authorizedPorts) {
                const info = port.getInfo();
                const portId = `${info.usbVendorId}_${info.usbProductId}`;
                authorizedPortIds.add(portId);
            }
            
            // Identifier les machines non autorisées
            this.machines.forEach(machine => {
                // Pour l'instant, marquer toutes les machines comme ayant besoin d'autorisation
                // si aucun port n'est autorisé
                if (authorizedPorts.length === 0) {
                    machine.needsAuthorization = true;
                }
            });
            
            // 5. Afficher immédiatement toutes les machines
            this.updateDisplay();
            
            // 6. Tenter la connexion automatique pour les ports autorisés
            if (authorizedPorts.length > 0) {
                await this.autoConnectMachines(authorizedPorts);
            }
            
        } catch (error) {
            console.error('Erreur chargement machines depuis BDD:', error);
        }
    }

    /**
     * Connexion automatique des machines avec ports autorisés
     */
    async autoConnectMachines(authorizedPorts) {
        if (authorizedPorts.length === 0) return;
        
        console.log(`Tentative de connexion automatique sur ${authorizedPorts.length} port(s) autorisé(s)`);
        
        // Pour chaque port autorisé
        for (const port of authorizedPorts) {
            try {
                // Ouvrir avec baudrate par défaut
                await port.open({ baudRate: 115200 });
                
                // Envoyer M990 automatiquement
                const detectedInfo = await this.getUUIDFromPort(port, true);
                
                if (detectedInfo) {
                    // Trouver la machine correspondante
                    const machine = this.findMachineByUUID(detectedInfo.uuid);
                    
                    if (machine) {
                        // 1. Statut "connecting" - Connexion au port
                        machine.status = 'connecting';
                        machine.port = port;
                        this.ports.set(machine.id, port);
                        this.updateDisplay();
                        
                        // 2. Statut "connected" - Port ouvert et prêt
                        setTimeout(() => {
                            machine.status = 'connected';
                            this.updateDisplay();
                        }, 1000);
                        
                        // 3. Statut "retrieving" - Récupération des informations
                        setTimeout(() => {
                            machine.status = 'retrieving';
                            this.updateDisplay();
                        }, 2000);
                        
                        // 4. Statut "ready" - Machine prête avec UUID sauvegardé
                        setTimeout(async () => {
                            machine.status = 'ready';
                            machine.isConnected = true;
                            machine.lastSeen = new Date();
                            
                            // Démarrer le monitoring de connexion
                            this.startConnectionMonitoring(machine.id);
                            
                            // Démarrer la lecture en arrière-plan
                            this.startReadingSerial(machine.id);
                            
                            // Mettre à jour le port COM dans la BDD
                            if (machine.uuid) {
                                await this.updatePortInDB(machine);
                                console.log(`UUID ${machine.uuid} sauvegardé en BDD pour ${machine.name}`);
                            }
                            
                            this.updateDisplay();
                            console.log(`Machine ${machine.name} prête automatiquement`);
                        }, 4000);
                        
                    } else {
                        // UUID inconnu - fermer le port
                        await port.close();
                        console.log(`UUID ${detectedInfo.uuid} inconnu - port fermé`);
                    }
                } else {
                    // Impossible de détecter l'UUID - fermer le port
                    await port.close();
                    console.log('Impossible de détecter l\'UUID - port fermé');
                }
            } catch (error) {
                console.error('Erreur connexion auto:', error);
                // Continuer avec les autres ports
            }
        }
        
        // Afficher résumé
        const readyCount = Array.from(this.machines.values())
            .filter(m => m.status === 'ready').length;
        
        if (readyCount > 0) {
            notificationManager.show(
                `${readyCount} machine(s) prête(s) automatiquement`, 
                'success'
            );
        }
    }

    /**
     * Obtenir l'UUID depuis un port série ouvert
     */
    async getUUIDFromPort(port, silent = true) {
        let reader = null;
        try {
            // Envoyer la commande M990
            const encoder = new TextEncoder();
            const writer = port.writable.getWriter();
            await writer.write(encoder.encode('M990\n'));
            writer.releaseLock();

            // Lire la réponse avec timeout
            const decoder = new TextDecoder();
            reader = port.readable.getReader();
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

            // Parser la réponse M990 pour extraire UUID et nom de machine
            let uuid = null;
            let machineName = null;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Chercher l'UUID: "Build UUID: bba13cbf-06d5-4dcc-bbdf-e31e95807911"
                if (line.startsWith('Build UUID:')) {
                    const uuidMatch = line.match(/Build UUID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
                    if (uuidMatch) {
                        uuid = uuidMatch[1];
                        if (!silent) {
                            console.log('UUID trouvé:', uuid);
                        }
                    }
                }
                
                // Chercher le nom de la machine: "Machine Name: Ender-3 Max 4.2.2"
                if (line.startsWith('Machine Name:')) {
                    const nameMatch = line.match(/Machine Name:\s*(.+)/);
                    if (nameMatch) {
                        machineName = nameMatch[1].trim();
                        if (!silent) {
                            console.log('Nom de machine trouvé:', machineName);
                        }
                    }
                }
            }
            
            // Retourner un objet avec UUID et nom si trouvés
            if (uuid) {
                return {
                    uuid: uuid,
                    machineName: machineName || null
                };
            }
            
            return null;
        } catch (error) {
            if (!silent) {
                console.error('Erreur lors de la récupération de l\'UUID:', error);
            }
            return null;
        } finally {
            // Toujours libérer le reader, même en cas d'erreur
            if (reader) {
                try {
                    reader.releaseLock();
                } catch (releaseError) {
                    // Ignorer les erreurs de libération (reader peut être déjà libéré ou annulé)
                }
            }
        }
    }

    /**
     * Trouver une machine par son UUID dans la liste actuelle
     */
    findMachineByUUID(uuid) {
        for (const [machineId, machine] of this.machines.entries()) {
            if (machine.uuid === uuid) {
                return machine;
            }
        }
        return null;
    }

    /**
     * Connecter une machine avec un port spécifique
     */
    async connectMachineWithPort(machine, port) {
        try {
            // Ouvrir avec le baudrate de la machine
            await port.open({ baudRate: machine.baudRate });
            
            // Envoyer M990 automatiquement (pas de notification)
            const detectedInfo = await this.getUUIDFromPort(port, true);
            
            if (!detectedInfo) {
                await port.close();
                notificationManager.show(
                    'Impossible de détecter l\'UUID de la machine', 
                    'error'
                );
                return false;
            }
            
            // Vérifier la correspondance
            if (detectedInfo.uuid === machine.uuid) {
                // 1. Statut "connecting" - Connexion au port
                machine.status = 'connecting';
                machine.port = port;
                this.ports.set(machine.id, port);
                this.updateDisplay();
                
                // 2. Statut "connected" - Port ouvert et prêt
                setTimeout(() => {
                    machine.status = 'connected';
                    this.updateDisplay();
                }, 1000);
                
                // 3. Statut "retrieving" - Récupération des informations
                setTimeout(() => {
                    machine.status = 'retrieving';
                    this.updateDisplay();
                }, 2000);
                
                // 4. Statut "ready" - Machine prête avec UUID sauvegardé
                setTimeout(async () => {
                    machine.status = 'ready';
                    machine.isConnected = true;
                    machine.lastSeen = new Date();
                    
                    // Démarrer le monitoring de connexion
                    this.startConnectionMonitoring(machine.id);
                    
                    // Démarrer la lecture en arrière-plan
                    this.startReadingSerial(machine.id);
                    
                    // Mettre à jour le port COM dans la BDD
                    if (machine.uuid) {
                        await this.updatePortInDB(machine);
                        console.log(`UUID ${machine.uuid} sauvegardé en BDD pour ${machine.name}`);
                    }
                    
                    this.updateDisplay();
                    notificationManager.show(`Machine ${machine.name} prête`, 'success');
                }, 4000);
                
                return true;
            } else {
                // Mauvaise machine - chercher la bonne
                const correctMachine = this.findMachineByUUID(detectedInfo.uuid);
                
                if (correctMachine) {
                    // Déconnecter l'ancienne si connectée
                    if (correctMachine.isConnected) {
                        await this.disconnectMachine(correctMachine.id);
                    }
                    
                    // 1. Statut "connecting" - Connexion au port
                    correctMachine.status = 'connecting';
                    correctMachine.port = port;
                    this.ports.set(correctMachine.id, port);
                    this.updateDisplay();
                    
                    // 2. Statut "connected" - Port ouvert et prêt
                    setTimeout(() => {
                        correctMachine.status = 'connected';
                        this.updateDisplay();
                    }, 1000);
                    
                    // 3. Statut "retrieving" - Récupération des informations
                    setTimeout(() => {
                        correctMachine.status = 'retrieving';
                        this.updateDisplay();
                    }, 2000);
                    
                    // 4. Statut "ready" - Machine prête avec UUID sauvegardé
                    setTimeout(async () => {
                        correctMachine.status = 'ready';
                        correctMachine.isConnected = true;
                        correctMachine.lastSeen = new Date();
                        
                        // Démarrer le monitoring de connexion
                        this.startConnectionMonitoring(correctMachine.id);
                        
                        // Démarrer la lecture en arrière-plan
                        this.startReadingSerial(correctMachine.id);
                        
                        // Mettre à jour le port COM dans la BDD
                        if (correctMachine.uuid) {
                            await this.updatePortInDB(correctMachine);
                            console.log(`UUID ${correctMachine.uuid} sauvegardé en BDD pour ${correctMachine.name}`);
                        }
                        
                        this.updateDisplay();
                        notificationManager.show(`Machine "${correctMachine.name}" trouvée et prête`, 'success');
                    }, 4000);
                    
                    // Continuer à chercher les autres machines
                    // Ne pas arrêter le processus
                    return true;
                } else {
                    // UUID inconnu
                    await port.close();
                    notificationManager.show(
                        'UUID inconnu - machine non enregistrée', 
                        'warning'
                    );
                    return false;
                }
            }
        } catch (error) {
            console.error('Erreur connexion:', error);
            notificationManager.show(
                `Erreur: ${error.message}`, 
                'error'
            );
            return false;
        }
    }

    /**
     * Finaliser la connexion d'une machine
     */
    async finalizeMachineConnection(machine, port) {
        machine.port = port;
        machine.status = 'connected';
        machine.isConnected = true;
        machine.lastSeen = new Date();
        machine.needsAuthorization = false;
        
        this.ports.set(machine.id, port);
        
        // Démarrer monitoring et lecture
        this.startConnectionMonitoring(machine.id);
        this.startReadingSerial(machine.id);
        
        // Mettre à jour la BDD
        await this.updatePortInDB(machine);
        
        this.updateDisplay();
    }

    /**
     * Autoriser et connecter une machine
     */
    async authorizeAndConnect(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }
        
        try {
            // Demander l'autorisation utilisateur
            const port = await navigator.serial.requestPort();
            
            // Une fois autorisé, connecter automatiquement
            await this.connectMachineWithPort(machine, port);
            
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                notificationManager.show('Autorisation refusée', 'warning');
            } else {
                console.error('Erreur autorisation:', error);
                notificationManager.show('Erreur lors de l\'autorisation', 'error');
            }
        }
    }

    /**
     * Connecter une machine existante (pour machines avec ports autorisés)
     */
    async connectExistingMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }
        
        // Vérifier si la machine est déjà connectée
        if (machine.isConnected || machine.status === 'ready' || machine.status === 'connected') {
            notificationManager.show('Machine déjà connectée', 'info');
            return;
        }
        
        // Vérifier si la machine est en cours de connexion
        if (machine.status === 'connecting' || machine.status === 'retrieving') {
            notificationManager.show('Connexion en cours...', 'info');
            return;
        }
        
        try {
            // Récupérer les ports autorisés
            const ports = await navigator.serial.getPorts();
            
            // Si pas de ports autorisés
            if (ports.length === 0) {
                machine.needsAuthorization = true;
                this.updateDisplay();
                return;
            }
            
            // Essayer chaque port
            for (const port of ports) {
                const success = await this.connectMachineWithPort(machine, port);
                if (success) break;
            }
            
        } catch (error) {
            console.error('Erreur:', error);
            notificationManager.show('Erreur lors de la connexion', 'error');
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
                
                // Démarrer le monitoring de connexion
                this.startConnectionMonitoring(machineId);
                
                // Démarrer la lecture en arrière-plan
                this.startReadingSerial(machineId);
                
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

        const oldBaudRate = machine.baudRate;
        machine.name = name;
        machine.baudRate = baudRate;
        
        // Si la machine est connectée et que le baud rate a changé, fermer et rouvrir
        if (machine.isConnected && oldBaudRate !== baudRate) {
            try {
                // Arrêter les readers actifs
                if (this.readers.has(machineId)) {
                    await this.stopReadingSerial(machineId);
                }

                // Fermer le port
                await machine.port.close();
                
                // Attendre un peu avant de rouvrir
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Rouvrir avec le nouveau baud rate
                await machine.port.open({ baudRate: baudRate });
                
                notificationManager.show(`Machine ${name} mise à jour`, 'success');
            } catch (error) {
                console.error('Erreur lors de la mise à jour:', error);
                machine.status = 'error';
                machine.isConnected = false;
                notificationManager.show('Erreur lors de la mise à jour', 'error');
            }
        } else {
            // Si seulement le nom a changé, pas besoin de fermer/rouvrir
            notificationManager.show(`Machine ${name} mise à jour`, 'success');
        }

        // Sauvegarder en BDD si UUID présent
        if (machine.uuid) {
            await this.saveMachineToDB(machine);
        }

        this.updateDisplay();
    }

    async disconnectMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        try {
            // Arrêter le monitoring de connexion
            this.stopConnectionMonitoring(machineId);
            
            // Arrêter la lecture si un reader est actif
            if (this.readers.has(machineId)) {
                await this.stopReadingSerial(machineId);
            }

            // Fermer proprement le port et nettoyer les références
            if (machine.port) {
                try {
                    // Essayer de fermer le port proprement
                    if (machine.port.readable) {
            await machine.port.close();
                    }
                } catch (error) {
                    console.log('Port déjà fermé ou erreur lors de la fermeture:', error);
                }
                // Attendre un peu pour s'assurer que le port est libéré
                await new Promise(resolve => setTimeout(resolve, 200));
                // Réinitialiser la référence du port
                machine.port = null;
                this.ports.delete(machineId);
            }
            
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
            this.stopConnectionMonitoring(machineId);
            // Réinitialiser la référence du port même en cas d'erreur
            if (machine.port) {
                machine.port = null;
            }
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

            // Arrêter le monitoring et la lecture
            this.stopConnectionMonitoring(machineId);
            if (this.readers.has(machineId)) {
                    await this.stopReadingSerial(machineId);
                }

            // Nettoyer l'ancien port s'il existe
            if (machine.port) {
                try {
                    // Essayer de fermer le port proprement
                    if (machine.port.readable) {
                await machine.port.close();
                    }
            } catch (error) {
                console.log('Port déjà fermé ou erreur lors de la fermeture:', error);
            }
                // Attendre un peu pour s'assurer que le port est libéré
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Vérifier si l'API Web Serial est supportée
            if (!('serial' in navigator)) {
                notificationManager.show('Web Serial API non supportée par ce navigateur', 'error');
                machine.status = 'disconnected';
                this.updateDisplay();
                return;
            }

            // Demander un nouveau port (l'utilisateur doit sélectionner)
            const port = await navigator.serial.requestPort();

            // Ouvrir le nouveau port
            await port.open({ baudRate: machine.baudRate });

            // Mettre à jour les références
            machine.port = port;
            this.ports.set(machineId, port);

            // Mettre à jour l'affichage
            this.updateDisplay();

            // Simuler la reconnexion
            setTimeout(async () => {
                machine.status = 'connected';
                machine.isConnected = true;
                machine.lastSeen = new Date();
                
                // Démarrer le monitoring de connexion
                this.startConnectionMonitoring(machineId);
                
                // Démarrer la lecture en arrière-plan
                this.startReadingSerial(machineId);
                
                // Mettre à jour le port COM dans la BDD
                if (machine.uuid) {
                    await this.updatePortInDB(machine);
                }
                
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} reconnectée`, 'success');
            }, 2000);

        } catch (error) {
            console.error('Erreur de reconnexion:', error);
            
            // Nettoyer en cas d'erreur
            if (machine.port) {
                try {
                    if (machine.port.readable) {
                        await machine.port.close();
                    }
                } catch (closeError) {
                    // Ignorer les erreurs de fermeture
                }
                machine.port = null;
            }
            
            machine.status = 'disconnected';
            machine.isConnected = false;
            this.updateDisplay();
            
            if (error.name === 'NotFoundError') {
                notificationManager.show('Aucun port série trouvé', 'error');
            } else if (error.name === 'NotAllowedError') {
                notificationManager.show('Accès au port série refusé', 'error');
            } else if (error.name === 'NetworkError') {
                notificationManager.show('Port déjà utilisé ou inaccessible', 'error');
            } else {
                notificationManager.show(`Erreur de reconnexion: ${error.message}`, 'error');
            }
        }
    }

    async removeMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            console.warn(`Machine ${machineId} introuvable`);
            return;
        }

        if (confirm(`Êtes-vous sûr de vouloir supprimer la machine "${machine.name}" ?`)) {
            try {
                // Supprimer de la base de données si UUID présent
                if (machine.uuid) {
                    const response = await fetch(`/api/machines/${machine.uuid}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Erreur lors de la suppression en base de données');
                    }
                }

                // Arrêter le monitoring de connexion
                this.stopConnectionMonitoring(machineId);
                
                // Arrêter la lecture si un reader est actif
                if (this.readers.has(machineId)) {
                    await this.stopReadingSerial(machineId);
                }

                // Fermer le port si connecté
                if (machine.isConnected && machine.port) {
                    try {
                        await machine.port.close();
                    } catch (error) {
                        console.warn('Port déjà fermé ou en cours de fermeture:', error.message);
                    }
                }

                // Supprimer les références locales
                this.machines.delete(machineId);
                this.ports.delete(machineId);
                this.readers.delete(machineId);
                
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} supprimée`, 'success');
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                
                // Si c'est une erreur 404 (machine non trouvée en BDD), 
                // supprimer quand même localement
                if (error.message.includes('Machine non trouvée') || error.message.includes('404')) {
                    
                    // Arrêter le monitoring de connexion
                    this.stopConnectionMonitoring(machineId);
                    
                    // Arrêter la lecture si un reader est actif
                    if (this.readers.has(machineId)) {
                        await this.stopReadingSerial(machineId);
                    }

                    // Fermer le port si connecté
                    if (machine.isConnected && machine.port) {
                        try {
                            await machine.port.close();
                        } catch (closeError) {
                            console.warn('Port déjà fermé:', closeError.message);
                        }
                    }

                    // Supprimer les références locales
                    this.machines.delete(machineId);
                    this.ports.delete(machineId);
                    this.readers.delete(machineId);
                    
                    this.updateDisplay();
                    notificationManager.show(`Machine ${machine.name} supprimée (localement)`, 'success');
                } else {
                    // Pour les autres erreurs, ne pas supprimer localement
                    notificationManager.show(`Erreur lors de la suppression: ${error.message}`, 'error');
                }
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
            'connected': 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900',
            'connecting': 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900',
            'retrieving': 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900',
            'ready': 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900',
            'disconnected': 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
            'error': 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'
        };

        const statusTexts = {
            'connected': 'Connectée',
            'connecting': 'Connexion...',
            'retrieving': 'Récupération des informations...',
            'ready': 'Prête',
            'disconnected': 'Non connecté',
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
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">${machine.name}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${machine.baudRate} baud</p>
                    </div>
                    <div class="flex items-center">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[machine.status]}">
                            ${statusTexts[machine.status]}
                        </span>
                    </div>
                </div>
                <div class="flex space-x-1">
                    <button 
                        onclick="machineManager.showModal('${machine.id}')"
                        class="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Paramètres"
                    >
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </button>
                    ${machine.status === 'ready' ? `
                    <button 
                        onclick="machineManager.showConsoleModal('${machine.id}')"
                        class="p-1 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="Console Serial"
                    >
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </button>
                    ` : ''}
                    <button 
                        onclick="machineManager.removeMachine('${machine.id}')"
                        class="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Activité:</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatTime(machine.lastSeen)}</span>
                </div>
                
                ${machine.uuid ? `
                <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                    <div class="bg-gray-100 dark:bg-gray-900 rounded-lg px-2 py-1.5">
                        <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">UUID Firmware</div>
                        <div class="text-xs font-mono text-gray-800 dark:text-gray-200 break-all">${machine.uuid}</div>
                    </div>
                </div>
                ` : ''}
            </div>

            ${machine.status === 'ready' ? `
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
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
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <button 
                        onclick="machineManager.${machine.needsAuthorization ? 'authorizeAndConnect' : 'connectExistingMachine'}('${machine.id}')"
                        class="w-full btn-primary text-xs py-1.5"
                    >
                        ${machine.needsAuthorization ? 'Autoriser le port' : 'Connecter'}
                    </button>
                </div>
            ` : machine.status === 'connecting' || machine.status === 'retrieving' ? `
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <div class="w-full text-center text-xs py-1.5 text-gray-500 dark:text-gray-400">
                        ${machine.status === 'connecting' ? 'Connexion en cours...' : 'Récupération des informations...'}
                    </div>
                </div>
            ` : machine.status === 'error' ? `
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <button 
                        onclick="machineManager.${machine.lastError === 'NotAllowedError' ? 'authorizeAndConnect' : 'connectExistingMachine'}('${machine.id}')"
                        class="w-full btn-primary text-xs py-1.5"
                    >
                        ${machine.lastError === 'NotAllowedError' ? 'Autoriser le port' : 'Réessayer'}
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
