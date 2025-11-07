/**
 * Gestionnaire des machines CNC
 */
const DEFAULT_INFO_COMMANDS = ['M990'];

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
        this.serialListeners = new Set();
        this.pendingDeletionMachine = null;
        this.infoCache = new Map();
        this.currentInfoMachine = null;
        this.infoRefreshInProgress = false;
        this.csrfHeaders = () => {
            const token = window.LineaCNC?.csrfToken;
            return token ? { 'X-CSRF-Token': token } : {};
        };
        if (typeof MachineTileView !== 'undefined') {
            this.tileView = new MachineTileView({
                containerId: 'machinesGrid',
                emptyStateId: 'noMachinesMessage'
            });
            this.tileView.setCallbacks({
                onEdit: (machineId) => this.showModal(machineId),
                onOpenConsole: (machineId) => this.showConsoleModal(machineId),
                onViewInfo: (machineId) => this.openInfoModal(machineId),
                onDelete: (machineId) => this.removeMachine(machineId),
                onDisconnect: (machineId) => this.disconnectMachine(machineId),
                onAuthorize: (machineId) => this.authorizeAndConnect(machineId),
                onConnect: (machineId) => this.connectExistingMachine(machineId),
                onRetry: (machineId) => this.connectExistingMachine(machineId)
            });
        } else {
            console.warn('MachineTileView non disponible - affichage des tuiles désactivé');
            this.tileView = null;
        }

        if (typeof MachineManagerView !== 'undefined') {
            this.managerView = new MachineManagerView();
            this.managerView.setCallbacks({
                onRequestAddMachine: () => this.addMachine(),
                onMachineFormSubmit: (data) => this.handleFormSubmit(data),
                onMachineModalClosed: () => this.resetEditingState(),
                onConsoleClosed: () => this.resetConsoleState(),
                onConsoleSend: (command) => this.handleConsoleSend(command),
                onConsoleNavigate: (direction) => this.navigateHistory(direction),
                onDeleteConfirmed: () => this.executePendingDeletion(),
                onDeleteCancelled: () => {
                    this.pendingDeletionMachine = null;
                },
                onInfoRefresh: () => this.refreshMachineInfo(),
                onInfoModalClosed: () => this.resetInfoState()
            });
        } else {
            console.warn('MachineManagerView non disponible - interactions limitées');
            this.managerView = null;
        }
        this.init();
    }

    normalizeInfoCommands(commands, { allowEmpty = false } = {}) {
        if (!Array.isArray(commands)) {
            return allowEmpty ? [] : [...DEFAULT_INFO_COMMANDS];
        }

        const normalized = commands
            .map((command) => (typeof command === 'string' ? command.trim().toUpperCase() : ''))
            .filter(Boolean);

        if (normalized.length === 0) {
            return allowEmpty ? [] : [...DEFAULT_INFO_COMMANDS];
        }

        return Array.from(new Set(normalized));
    }

    init() {
        this.updateDisplay();
        // Charger les machines sauvegardées depuis la BDD
        this.loadMachinesFromDB();
    }

    addSerialListener(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }
        this.serialListeners.add(listener);
        return () => this.serialListeners.delete(listener);
    }

    emitSerialData(machineId, data) {
        if (this.serialListeners.size === 0) {
            return;
        }

        const machine = this.machines.get(machineId) || null;
        this.serialListeners.forEach((listener) => {
            try {
                listener({ machineId, machine, data });
            } catch (error) {
                console.error('Erreur dans un listener série:', error);
            }
        });
    }

    resetEditingState() {
        this.currentEditingMachine = null;
    }

    resetConsoleState() {
        this.currentConsoleMachine = null;
        this.historyIndex = -1;
        this.managerView?.clearConsoleInput();
    }

    resetInfoState() {
        this.currentInfoMachine = null;
        this.infoRefreshInProgress = false;
        this.managerView?.setInfoRefreshState?.(false);
    }

    async handleFormSubmit({ name, baudRate, infoCommands }) {
        if (!this.currentEditingMachine || !this.machines.has(this.currentEditingMachine)) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }

        if (!name) {
            notificationManager.show('Le nom de la machine est requis', 'error');
            this.managerView?.focusMachineName();
            return;
        }

        const machine = this.machines.get(this.currentEditingMachine);
        const parsedBaudRate = Number.isInteger(baudRate) ? baudRate : parseInt(baudRate, 10);
        const sanitizedBaudRate = Number.isNaN(parsedBaudRate) ? machine?.baudRate : parsedBaudRate;

        const normalizedCommands = Array.isArray(infoCommands) && infoCommands.length > 0
            ? this.normalizeInfoCommands(infoCommands)
            : machine.infoCommands;

        await this.updateMachine(this.currentEditingMachine, name, sanitizedBaudRate, normalizedCommands);
        this.managerView?.closeMachineModal();
    }

    showModal(machineId) {
        if (!machineId || !this.machines.has(machineId)) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }

        this.currentEditingMachine = machineId;
        const machine = this.machines.get(machineId);
        this.managerView?.showMachineModal({
            name: machine.name,
            baudRate: machine.baudRate,
            infoCommands: machine.infoCommands
        });
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
        this.historyIndex = -1;
        this.managerView?.showConsoleModal();

        // Démarrer la lecture des données seulement si pas déjà active
        if (!this.readers.has(machineId)) {
            this.startReadingSerial(machineId);
        }
    }

    openInfoModal(machineId) {
        if (!machineId || !this.machines.has(machineId)) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }

        const machine = this.machines.get(machineId);
        this.currentInfoMachine = machineId;

        const lastSyncLabel = machine.lastInfoSync
            ? new Date(machine.lastInfoSync).toLocaleString('fr-FR')
            : 'Jamais';

        this.managerView?.showInfoModal({
            machineName: machine.name,
            lastSyncLabel,
            commands: machine.infoCommands
        });

        this.managerView?.setInfoModalError?.(null);
        this.managerView?.setInfoRefreshState?.(false);

        this.fetchAndDisplayMachineInfo(machine).catch((error) => {
            console.error('Erreur affichage informations machine:', error);
        });
    }

    async hideConsoleModal() {
        this.managerView?.closeConsoleModal();
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

    async handleConsoleSend(command) {
        const trimmedCommand = (command || '').trim();

        if (!trimmedCommand) {
            return;
        }

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
            this.addToHistory(trimmedCommand);
            const outbound = `> ${trimmedCommand}`;
            this.appendToConsole(outbound, 'text-blue-400');
            this.emitSerialData(this.currentConsoleMachine, outbound);

            const encoder = new TextEncoder();
            const writer = machine.port.writable.getWriter();
            await writer.write(encoder.encode(`${trimmedCommand}\n`));
            writer.releaseLock();

            this.managerView?.clearConsoleInput();
            this.historyIndex = -1;
            this.managerView?.focusConsoleInput();
        } catch (error) {
            console.error('Erreur lors de l\'envoi:', error);
            const errorMessage = `[Erreur] ${error.message}`;
            this.appendToConsole(errorMessage, 'text-red-400');
            this.emitSerialData(this.currentConsoleMachine, errorMessage);
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
        if (this.commandHistory.length === 0 || !this.managerView) {
            return;
        }

        if (direction === 'up') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                const value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
                this.managerView.setConsoleInputValue(value);
            }
        } else if (direction === 'down') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
                this.managerView.setConsoleInputValue(value);
            } else if (this.historyIndex === 0) {
                this.historyIndex = -1;
                this.managerView.clearConsoleInput();
            }
        }
    }

    appendToConsole(text, colorClass = 'text-green-400') {
        this.managerView?.appendToConsole(text, colorClass);
    }

    async fetchAndDisplayMachineInfo(machine, { bypassCache = false } = {}) {
        if (!machine || !machine.uuid) {
            return;
        }

        const cacheKey = machine.id;

        if (!bypassCache && this.infoCache.has(cacheKey)) {
            const cached = this.infoCache.get(cacheKey);
            this.renderMachineInfo(machine, cached);
            this.managerView?.setInfoModalLoading(false);
            return;
        }

        this.managerView?.setInfoModalLoading(true);
        this.managerView?.setInfoModalError?.(null);

        try {
            const response = await fetch(`/api/machines/${machine.uuid}/info`, {
                headers: {
                    Accept: 'application/json',
                    ...this.csrfHeaders()
                }
            });

            if (response.status === 404) {
                const emptyPayload = {
                    machine: {
                        infoCommands: machine.infoCommands
                    },
                    syncedAt: null,
                    commandResults: []
                };
                this.infoCache.set(cacheKey, emptyPayload);
                this.renderMachineInfo(machine, emptyPayload);
                machine.lastInfoSync = null;
                this.updateDisplay();
                return;
            }

            if (!response.ok) {
                throw new Error('Réponse inattendue du serveur');
            }

            const data = await response.json();
            this.infoCache.set(cacheKey, data);
            this.renderMachineInfo(machine, data);

            const syncedAt = data?.syncedAt || data?.machine?.infoSyncedAt || null;
            if (syncedAt) {
                const date = new Date(syncedAt);
                if (!Number.isNaN(date.getTime())) {
                    machine.lastInfoSync = date;
                    this.updateDisplay();
                }
            }
        } catch (error) {
            console.error('Erreur récupération informations machine:', error);
            this.managerView?.setInfoModalError?.("Impossible de récupérer les informations de la machine.");
        } finally {
            this.managerView?.setInfoModalLoading(false);
        }
    }

    renderMachineInfo(machine, payload) {
        if (!machine) {
            return;
        }

        const commands = payload?.machine?.infoCommands || machine.infoCommands;
        const syncedAt = payload?.syncedAt || payload?.machine?.infoSyncedAt || machine.lastInfoSync || null;
        const lastSyncLabel = syncedAt
            ? new Date(syncedAt).toLocaleString('fr-FR')
            : 'Jamais';

        this.managerView?.updateInfoMeta({
            machineName: machine.name,
            lastSyncLabel,
            commands
        });

        this.managerView?.renderInfoModalContent(payload?.commandResults || []);
    }

    async refreshMachineInfo() {
        if (!this.currentInfoMachine || !this.machines.has(this.currentInfoMachine)) {
            return;
        }

        const machine = this.machines.get(this.currentInfoMachine);
        if (!machine) {
            return;
        }

        this.managerView?.setInfoRefreshState?.(true);
        this.managerView?.setInfoModalError?.(null);

        try {
            const { results } = await this.collectAndPersistMachineInfo(machine, { silent: false }) || {};

            if (!results || results.length === 0) {
                const emptyMessage = 'Aucune donnée renvoyée par la machine.';
                this.managerView?.setInfoModalError?.(emptyMessage);
                notificationManager.show(emptyMessage, 'warning');
                return;
            }

            notificationManager.show('Informations machine actualisées', 'success');
        } catch (error) {
            console.error('Erreur actualisation informations machine:', error);
            let message = error.message || 'Impossible d\'actualiser les informations.';
            let level = 'error';

            if (error.code === 'MACHINE_DISCONNECTED') {
                message = 'Connectez la machine pour actualiser les informations.';
                level = 'warning';
            } else if (error.code === 'INFO_SYNC_IN_PROGRESS') {
                message = 'Une synchronisation des informations est déjà en cours.';
                level = 'info';
            }

            this.managerView?.setInfoModalError?.(message);
            notificationManager.show(message, level);
        } finally {
            this.managerView?.setInfoRefreshState?.(false);
        }
    }

    async collectInfoFromMachine(machine, commandsOverride = null) {
        let sourceCommands;
        if (Array.isArray(commandsOverride)) {
            sourceCommands = commandsOverride;
        } else if (Array.isArray(machine.infoCommands) && machine.infoCommands.length > 0) {
            sourceCommands = machine.infoCommands;
        } else {
            sourceCommands = DEFAULT_INFO_COMMANDS;
        }

        if (!Array.isArray(sourceCommands) || sourceCommands.length === 0) {
            return [];
        }

        const commands = this.normalizeInfoCommands(sourceCommands, { allowEmpty: true });

        if (commands.length === 0) {
            return [];
        }

        const results = [];
        for (let i = 0; i < commands.length; i += 1) {
            const command = typeof commands[i] === 'string' ? commands[i].trim().toUpperCase() : '';
            if (!command) {
                continue;
            }

            const lines = await this.collectCommandResponse(machine.id, command, 7000);
            const parsed = this.parseInfoResponse(lines);
            results.push({
                command,
                rawOutput: parsed.rawOutput,
                entries: parsed.entries,
                capturedAt: new Date().toISOString()
            });
        }

        return results;
    }

    async collectCommandResponse(machineId, command, timeout = 7000) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.port) {
            throw new Error('Machine non connectée');
        }

        let detachListener = null;
        let timeoutId = null;
        const lines = [];

        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (typeof detachListener === 'function') {
                detachListener();
                detachListener = null;
            }
        };

        const responsePromise = new Promise((resolve, reject) => {
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`Timeout lors de l'exécution de ${command}`));
            }, timeout);

            detachListener = this.addSerialListener(({ machineId: incomingId, data }) => {
                if (incomingId !== machineId) {
                    return;
                }

                const text = typeof data === 'string' ? data.trim() : '';
                if (!text) {
                    return;
                }

                if (text.toUpperCase() === command.toUpperCase()) {
                    return;
                }

                if (text.toLowerCase() === 'ok') {
                    cleanup();
                    resolve(lines);
                    return;
                }

                lines.push(text);
            });
        });

        try {
            const writer = machine.port.writable.getWriter();
            try {
                const encoder = new TextEncoder();
                await writer.write(encoder.encode(`${command}\n`));
            } finally {
                writer.releaseLock();
            }

            const result = await responsePromise;
            return result;
        } catch (error) {
            cleanup();
            throw error;
        } finally {
            cleanup();
        }
    }

    parseInfoResponse(lines = []) {
        if (!Array.isArray(lines)) {
            return { entries: [], rawOutput: '' };
        }

        const entries = [];

        lines.forEach((originalLine, index) => {
            const line = typeof originalLine === 'string' ? originalLine.trim() : '';
            if (!line) {
                return;
            }

            if (line.toLowerCase() === 'ok') {
                return;
            }

            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) {
                entries.push({
                    label: line,
                    value: '',
                    position: index
                });
                return;
            }

            const label = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            entries.push({
                label: label || `Ligne ${index + 1}`,
                value,
                position: index
            });
        });

        return {
            entries,
            rawOutput: lines.join('\n')
        };
    }

    async syncMachineInformation(machine, initialInfo = null) {
        if (!machine || !machine.uuid) {
            return;
        }

        if (this.infoRefreshInProgress) {
            return;
        }

        this.infoRefreshInProgress = true;

        try {
            const results = [];
            const processed = new Set();

            if (initialInfo && Array.isArray(initialInfo.entries) && initialInfo.entries.length > 0) {
                const normalizedCommand = (initialInfo.command || 'M990').toUpperCase();
                processed.add(normalizedCommand);
                results.push({
                    command: normalizedCommand,
                    rawOutput: initialInfo.rawOutput || this.parseInfoResponse(initialInfo.entries.map((entry) => `${entry.label}: ${entry.value}`)).rawOutput,
                    entries: initialInfo.entries,
                    capturedAt: new Date().toISOString()
                });
            }

            const remainingCommands = Array.isArray(machine.infoCommands) && machine.infoCommands.length > 0
                ? this.normalizeInfoCommands(machine.infoCommands, { allowEmpty: true }).filter((command) => !processed.has(command))
                : [...DEFAULT_INFO_COMMANDS].filter((command) => !processed.has(command));

            if (remainingCommands.length > 0) {
                try {
                    const additionalResults = await this.collectInfoFromMachine(machine, remainingCommands);
                    additionalResults.forEach((result) => {
                        if (result?.command) {
                            processed.add(result.command);
                        }
                        results.push(result);
                    });
                } catch (error) {
                    console.warn('Erreur lors de la collecte automatique des informations:', error);
                }
            }

            if (results.length === 0) {
                return;
            }

            await this.persistAndUpdateInfo(machine, results, { silent: true });
        } finally {
            this.infoRefreshInProgress = false;
        }
    }

    async persistMachineInfo(machine, commandResults, { silent = false } = {}) {
        if (!machine || !machine.uuid || !Array.isArray(commandResults) || commandResults.length === 0) {
            return null;
        }

        try {
            const response = await fetch(`/api/machines/${machine.uuid}/info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.csrfHeaders()
                },
                body: JSON.stringify({
                    commandResults: commandResults.map((result, commandIndex) => ({
                        command: result.command,
                        rawOutput: result.rawOutput,
                        capturedAt: result.capturedAt || new Date().toISOString(),
                        entries: Array.isArray(result.entries)
                            ? result.entries.map((entry, entryIndex) => ({
                                label: entry?.label || '',
                                value: entry?.value ?? '',
                                position: typeof entry?.position === 'number' ? entry.position : entryIndex
                            }))
                            : []
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('Erreur serveur lors de l\'enregistrement des informations');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erreur enregistrement informations machine:', error);
            if (!silent) {
                notificationManager.show('Erreur lors de l\'enregistrement des informations machine.', 'error');
            }
            if (!error.code) {
                error.code = 'MACHINE_INFO_PERSIST_FAILED';
            }
            throw error;
        }
    }

    async persistAndUpdateInfo(machine, commandResults, { silent = false } = {}) {
        if (!machine || !Array.isArray(commandResults) || commandResults.length === 0) {
            return null;
        }

        const response = await this.persistMachineInfo(machine, commandResults, { silent });

        if (response?.syncedAt) {
            const date = new Date(response.syncedAt);
            if (!Number.isNaN(date.getTime())) {
                machine.lastInfoSync = date;
                this.updateDisplay();
            }
        }

        this.infoCache.delete(machine.id);

        if (this.currentInfoMachine === machine.id) {
            await this.fetchAndDisplayMachineInfo(machine, { bypassCache: true });
        }

        return response;
    }

    async collectAndPersistMachineInfo(machine, { silent = false } = {}) {
        if (!machine || !machine.uuid) {
            return null;
        }

        if (!machine.isConnected || !machine.port) {
            const error = new Error('Machine non connectée');
            error.code = 'MACHINE_DISCONNECTED';
            throw error;
        }

        if (this.infoRefreshInProgress) {
            const error = new Error('Une synchronisation est déjà en cours.');
            error.code = 'INFO_SYNC_IN_PROGRESS';
            throw error;
        }

        this.infoRefreshInProgress = true;

        try {
            const results = await this.collectInfoFromMachine(machine);

            if (!Array.isArray(results) || results.length === 0) {
                return { results: [], response: null };
            }

            const response = await this.persistAndUpdateInfo(machine, results, { silent });

            return { results, response };
        } finally {
            this.infoRefreshInProgress = false;
        }
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
                            const trimmed = line.trim();
                            if (trimmed) {
                                machine.lastSeen = new Date();
                                this.emitSerialData(machineId, trimmed);
                                if (this.currentConsoleMachine === machineId) {
                                    this.appendToConsole(trimmed);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la lecture:', error);
                    if (this.currentConsoleMachine === machineId) {
                        const errorMessage = `[Erreur lecture] ${error.message}`;
                        this.appendToConsole(errorMessage, 'text-red-400');
                        this.emitSerialData(machineId, errorMessage);
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
            await this.safeClosePort(machine.port);
            machine.port = null;
            this.ports.delete(machineId);
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

    async addMachine() {
        let port = null;
        let machineId = null;
        try {
            if (!('serial' in navigator)) {
                notificationManager.show('Web Serial API non supportée par ce navigateur', 'error');
                return;
            }

            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 115200 });

            machineId = 'machine_' + Date.now();
            const machine = {
                id: machineId,
                name: `Machine ${this.machines.size + 1}`,
                port,
                status: 'connecting',
                lastSeen: new Date(),
                baudRate: 115200,
                isConnected: false,
                uuid: null,
                needsAuthorization: false,
                lastKnownPortDescriptor: null,
                legacyPortDescriptor: null,
                infoCommands: this.normalizeInfoCommands(DEFAULT_INFO_COMMANDS),
                lastInfoSync: null
            };

            this.machines.set(machineId, machine);
            this.ports.set(machineId, port);
            this.updateDisplay();

            const detectedInfo = await this.getUUIDFromPort(port, false);
            if (!detectedInfo) {
                throw new Error("Impossible de détecter l'UUID de la machine");
            }

            machine.uuid = detectedInfo.uuid;
            if (detectedInfo.machineName) {
                machine.name = detectedInfo.machineName;
            }

            this.rememberPortDescriptor(machine, port);

            await this.saveMachineToDB(machine);
            await this.finalizeReadyState(machine, port, `Machine ${machine.name} prête`, detectedInfo);
        } catch (error) {
            console.error("Erreur lors de l'ajout de la machine:", error);

            if (machineId && this.machines.has(machineId)) {
                this.machines.delete(machineId);
                this.ports.delete(machineId);
                this.updateDisplay();
            }

            await this.safeClosePort(port);

            let message = "Erreur: Impossible d'ajouter la machine";
            if (error?.message) {
                message = error.message;
            }
            if (error?.name === 'NotAllowedError') {
                message = 'Accès au port série refusé';
            } else if (error?.name === 'NotFoundError') {
                message = 'Aucun port série trouvé';
            }
            notificationManager.show(message, 'error');
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
        const portName = machine.lastKnownPortDescriptor
            || (machine.port ? this.describePort(machine.port) : machine.port || null);

        try {
            const response = await fetch('/api/machines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.csrfHeaders()
                },
                body: JSON.stringify({
                    uuid: machine.uuid,
                    name: machine.name,
                    baudRate: machine.baudRate,
                    port: portName,
                    infoCommands: machine.infoCommands
                })
            });

            const payload = await response.json();

            if (!response.ok || payload.success !== true) {
                const error = new Error(payload?.error || 'Erreur lors de la sauvegarde de la machine.');
                error.code = 'MACHINE_SAVE_FAILED';
                throw error;
            }

            return payload;
        } catch (error) {
            console.error('Erreur sauvegarde machine en BDD:', error);
            throw error;
        }
    }

    async updatePortInDB(machine) {
        try {
            if (!machine.port && !machine.lastKnownPortDescriptor) {
                console.log('Port inconnu, pas de mise à jour BDD');
                return;
            }

            const portName = machine.lastKnownPortDescriptor
                || (machine.port ? this.describePort(machine.port) : 'unknown');

            const response = await fetch('/api/machines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.csrfHeaders()
                },
                body: JSON.stringify({
                    uuid: machine.uuid,
                    name: machine.name,
                    baudRate: machine.baudRate,
                    port: portName,
                    infoCommands: machine.infoCommands
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
            const response = await fetch('/api/machines', {
                headers: {
                    ...this.csrfHeaders()
                }
            });
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
                const baudRateValue = dbMachine.baudRate ?? dbMachine.baud_rate;
                const lastPort = dbMachine.lastPort ?? dbMachine.last_port ?? null;
                const infoCommandSource = Array.isArray(dbMachine.infoCommands)
                    ? dbMachine.infoCommands
                    : dbMachine.info_commands;
                const infoSyncedAt = dbMachine.infoSyncedAt ?? dbMachine.info_synced_at;
                const parsedBaudRate = Number.parseInt(baudRateValue, 10);
                const sanitizedBaudRate = Number.isNaN(parsedBaudRate) ? 115200 : parsedBaudRate;

                const updatedAt = dbMachine.updatedAt ?? dbMachine.updated_at;
                const createdAt = dbMachine.createdAt ?? dbMachine.created_at;

                const machine = {
                    id: machineId,
                    uuid: dbMachine.uuid,
                    name: dbMachine.name,
                    port: null,
                    status: 'disconnected',
                    lastSeen: updatedAt ? new Date(updatedAt) : createdAt ? new Date(createdAt) : new Date(),
                    baudRate: sanitizedBaudRate,
                    isConnected: false,
                    lastError: null,
                    needsAuthorization: false,
                    lastKnownPortDescriptor: lastPort,
                    legacyPortDescriptor: lastPort,
                    infoCommands: this.normalizeInfoCommands(infoCommandSource),
                    lastInfoSync: infoSyncedAt ? new Date(infoSyncedAt) : null
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
        if (!Array.isArray(authorizedPorts) || authorizedPorts.length === 0) return;

        let readyCount = 0;

        for (const port of authorizedPorts) {
            let detectedInfo = null;
            try {
                await port.open({ baudRate: 115200 });
                detectedInfo = await this.getUUIDFromPort(port, true);
            } catch (error) {
                console.error('Erreur lors de la détection automatique:', error);
            } finally {
                await this.safeClosePort(port);
            }

            if (!detectedInfo) {
                continue;
            }

            const machine = this.findMachineByUUID(detectedInfo.uuid);
            if (!machine) {
                console.log(`UUID ${detectedInfo.uuid} inconnu - port ignoré`);
                continue;
            }

            try {
                await port.open({ baudRate: machine.baudRate });
                machine.status = 'connecting';
                machine.needsAuthorization = false;
                this.updateDisplay();
                if (detectedInfo.machineName && !machine.name) {
                    machine.name = detectedInfo.machineName;
                }
                const message = `Machine ${machine.name} prête automatiquement`;
                const success = await this.finalizeReadyState(machine, port, message, detectedInfo);
                if (success) {
                    readyCount += 1;
                }
            } catch (error) {
                await this.safeClosePort(port);
                console.error('Erreur connexion auto:', error);
            }
        }

        if (readyCount > 0) {
            notificationManager.show(`${readyCount} machine(s) prête(s) automatiquement`, 'success');
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

            const filteredLines = lines.filter((line) => line.trim().toLowerCase() !== 'ok');
            const parsed = this.parseInfoResponse(filteredLines);

            let uuid = null;
            let machineName = null;

            parsed.entries.forEach((entry) => {
                if (!entry || !entry.label) {
                    return;
                }
                const label = entry.label.toLowerCase();
                if (!uuid && label.startsWith('build uuid')) {
                    const uuidMatch = entry.value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                    if (uuidMatch) {
                        uuid = uuidMatch[0];
                        if (!silent) {
                            console.log('UUID trouvé:', uuid);
                        }
                    }
                }

                if (!machineName && label.startsWith('machine name')) {
                    machineName = entry.value.trim();
                    if (!silent) {
                        console.log('Nom de machine trouvé:', machineName);
                    }
                }
            });

            if (uuid) {
                return {
                    uuid,
                    machineName: machineName || null,
                    entries: parsed.entries,
                    rawOutput: parsed.rawOutput,
                    command: 'M990'
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

    resolveMachineForUUID(machine, uuid) {
        if (!uuid) {
            return null;
        }

        const existing = this.findMachineByUUID(uuid);
        if (existing && existing.id !== machine.id) {
            return existing;
        }

        machine.uuid = uuid;
        return machine;
    }

    describePort(port) {
        if (!port || typeof port.getInfo !== 'function') {
            return 'unknown';
        }

        try {
            const info = port.getInfo();
            const vendor = typeof info.usbVendorId === 'number'
                ? info.usbVendorId.toString(16).padStart(4, '0')
                : null;
            const product = typeof info.usbProductId === 'number'
                ? info.usbProductId.toString(16).padStart(4, '0')
                : null;
            const serialNumber = port?.serialNumber ? String(port.serialNumber) : null;

            const segments = [];
            if (vendor) segments.push(`v${vendor}`);
            if (product) segments.push(`p${product}`);
            if (serialNumber) segments.push(`s${serialNumber}`);

            return segments.length ? segments.join(':') : 'unknown';
        } catch (error) {
            console.warn('Impossible de récupérer les informations du port:', error);
            return 'unknown';
        }
    }

    rememberPortDescriptor(machine, port) {
        if (!machine) {
            return 'unknown';
        }

        const descriptor = this.describePort(port);
        machine.lastKnownPortDescriptor = descriptor;
        machine.legacyPortDescriptor = descriptor;
        return descriptor;
    }

    getKnownPortDescriptors(machine) {
        const descriptors = [];
        if (machine?.lastKnownPortDescriptor) {
            descriptors.push(machine.lastKnownPortDescriptor);
        }
        if (machine?.legacyPortDescriptor && machine.legacyPortDescriptor !== machine?.lastKnownPortDescriptor) {
            descriptors.push(machine.legacyPortDescriptor);
        }
        return descriptors;
    }

    matchesPortDescriptor(port, descriptor) {
        if (!descriptor || descriptor === 'unknown') {
            return false;
        }

        const normalizedDescriptor = descriptor.toString().toLowerCase();
        const currentDescriptor = this.describePort(port).toLowerCase();

        if (currentDescriptor !== 'unknown' && currentDescriptor === normalizedDescriptor) {
            return true;
        }

        if (normalizedDescriptor.startsWith('com')) {
            const info = port.getInfo();
            const legacyName = info.usbProductId ? `com${info.usbProductId}`.toLowerCase() : 'unknown';
            return legacyName === normalizedDescriptor;
        }

        return false;
    }

    isPortInUse(port) {
        for (const trackedPort of this.ports.values()) {
            if (trackedPort === port) {
                return true;
            }
        }
        return false;
    }

    filterAvailablePorts(ports) {
        return ports.filter((port) => !this.isPortInUse(port));
    }

    prioritizePorts(machine, ports) {
        if (!Array.isArray(ports)) {
            return [];
        }

        const descriptors = this.getKnownPortDescriptors(machine);
        if (!descriptors.length) {
            return [...ports];
        }

        const matched = [];
        const others = [];

        ports.forEach((port) => {
            const isMatch = descriptors.some((descriptor) => this.matchesPortDescriptor(port, descriptor));
            if (isMatch) {
                matched.push(port);
            } else {
                others.push(port);
            }
        });

        return [...matched, ...others];
    }

    async listAuthorizedPorts() {
        if (!('serial' in navigator)) {
            return [];
        }

        try {
            return await navigator.serial.getPorts();
        } catch (error) {
            console.warn('Impossible de récupérer les ports autorisés:', error);
            return [];
        }
    }

    async connectUsingAuthorizedPorts(machine) {
        const ports = await this.listAuthorizedPorts();
        const hadPorts = ports.length > 0;
        const availablePorts = this.filterAvailablePorts(ports);
        const hadAvailablePorts = availablePorts.length > 0;
        const orderedPorts = this.prioritizePorts(machine, availablePorts);

        for (const port of orderedPorts) {
            const success = await this.connectMachineWithPort(machine, port);
            if (success) {
                return { connected: true, hadPorts, hadAvailablePorts };
            }
        }

        return { connected: false, hadPorts, hadAvailablePorts };
    }

    async finalizeReadyState(machine, port, notificationMessage, initialInfo = null) {
        if (!machine) return false;

        machine.port = port;
        machine.status = 'connected';
        this.updateDisplay();

        machine.status = 'retrieving';
        this.updateDisplay();

        machine.status = 'ready';
        machine.isConnected = true;
        machine.needsAuthorization = false;
        machine.lastSeen = new Date();
        this.ports.set(machine.id, port);

        this.rememberPortDescriptor(machine, port);

        this.startConnectionMonitoring(machine.id);
        this.startReadingSerial(machine.id);

        if (machine.uuid) {
            await this.updatePortInDB(machine);
        }

        this.updateDisplay();

        if (notificationMessage) {
            notificationManager.show(notificationMessage, 'success');
        }

        try {
            await this.syncMachineInformation(machine, initialInfo);
        } catch (error) {
            console.warn('Synchronisation des informations échouée:', error);
        }

        return true;
    }

    async safeClosePort(port) {
        if (!port) return;
        try {
            if (port.readable) {
                await port.close();
            }
        } catch (error) {
            console.warn('Fermeture du port ignorée:', error.message);
        }
    }

    handleConnectionError(machine, error) {
        if (!machine) {
            return;
        }

        machine.status = 'disconnected';
        machine.isConnected = false;
        machine.port = null;
        this.ports.delete(machine.id);
        this.updateDisplay();

        let message = error?.message || 'Erreur lors de la connexion';
        let level = 'error';
        if (error?.name === 'NotAllowedError') {
            message = 'Accès au port série refusé';
        } else if (error?.name === 'NotFoundError') {
            message = 'Aucun port série trouvé';
        } else if (message && message.toLowerCase().includes('uuid inconnu')) {
            level = 'warning';
        }

        if (message) {
            notificationManager.show(message, level);
        }
    }

    /**
     * Connecter une machine avec un port spécifique
     */
    async connectMachineWithPort(machine, port) {
        if (!machine || !port) {
            return false;
        }

        let openedHere = false;
        try {
            if (!port.readable) {
                await port.open({ baudRate: machine.baudRate });
                openedHere = true;
            }

            machine.status = 'connecting';
            machine.needsAuthorization = false;
            machine.port = port;
            this.ports.set(machine.id, port);
            this.updateDisplay();

            const detectedInfo = await this.getUUIDFromPort(port, true);
            if (!detectedInfo) {
                throw new Error("Impossible de détecter l'UUID de la machine");
            }

            const targetMachine = this.resolveMachineForUUID(machine, detectedInfo.uuid);
            if (!targetMachine) {
                throw new Error('UUID inconnu - machine non enregistrée');
            }

            if (targetMachine !== machine) {
                machine.status = 'disconnected';
                machine.port = null;
                this.updateDisplay();
            }

            if (detectedInfo.machineName && !targetMachine.name) {
                targetMachine.name = detectedInfo.machineName;
            }

            await this.finalizeReadyState(targetMachine, port, `Machine ${targetMachine.name} prête`, detectedInfo);
            return true;
        } catch (error) {
            await this.safeClosePort(port);
            if (openedHere && machine) {
                machine.port = null;
            }
            this.handleConnectionError(machine, error);
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
            const { connected } = await this.connectUsingAuthorizedPorts(machine);
            if (connected) {
                return;
            }

            const port = await navigator.serial.requestPort();
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
            if (typeof notificationManager !== 'undefined') {
                notificationManager.show('Machine non trouvée', 'error');
            } else {
                console.error('Machine non trouvée');
            }
            return;
        }

        if (machine.isConnected || machine.status === 'ready' || machine.status === 'connected') {
            notificationManager.show('Machine déjà connectée', 'info');
            return;
        }

        if (machine.status === 'connecting' || machine.status === 'retrieving') {
            notificationManager.show('Connexion en cours...', 'info');
            return;
        }

        try {
            const { connected, hadPorts, hadAvailablePorts } = await this.connectUsingAuthorizedPorts(machine);

            if (connected) {
                return;
            }

            if (!hadPorts) {
                machine.needsAuthorization = true;
                this.updateDisplay();
                notificationManager.show('Aucun port autorisé disponible', 'warning');
                return;
            }

            if (!hadAvailablePorts) {
                notificationManager.show('Tous les ports autorisés sont déjà utilisés', 'warning');
                return;
            }

            notificationManager.show('Impossible de connecter la machine avec les ports autorisés', 'warning');
        } catch (error) {
            console.error('Erreur:', error);
            this.handleConnectionError(machine, error);
        }
    }

    async tryReconnectMachine(dbMachine) {
        try {
            if (!('serial' in navigator)) {
                return;
            }

            const machine = this.findMachineByUUID(dbMachine.uuid);
            if (!machine || machine.isConnected) {
                return;
            }

            const descriptor = dbMachine.port || dbMachine.last_port || null;
            if (descriptor && !machine.lastKnownPortDescriptor) {
                machine.lastKnownPortDescriptor = descriptor;
            }
            if (descriptor && !machine.legacyPortDescriptor) {
                machine.legacyPortDescriptor = descriptor;
            }

            const { connected } = await this.connectUsingAuthorizedPorts(machine);
            if (connected) {
                notificationManager.show(`Machine ${machine.name} reconnectée automatiquement`, 'success');
            }
        } catch (error) {
            console.error('Erreur reconnexion automatique:', error);
        }
    }

    async updateMachine(machineId, name, baudRate, infoCommands) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        const previousName = machine.name;
        const previousBaudRate = machine.baudRate;
        const previousCommands = Array.isArray(machine.infoCommands) ? [...machine.infoCommands] : [];

        machine.name = name;
        machine.baudRate = baudRate;

        const normalizedCommands = this.normalizeInfoCommands(infoCommands || machine.infoCommands);
        const commandsChanged = JSON.stringify(normalizedCommands) !== JSON.stringify(previousCommands);
        machine.infoCommands = normalizedCommands;
        if (commandsChanged) {
            this.infoCache.delete(machineId);
        }

        if (machine.isConnected && previousBaudRate !== baudRate) {
            try {
                if (this.readers.has(machineId)) {
                    await this.stopReadingSerial(machineId);
                }

                await machine.port.close();
                await new Promise((resolve) => setTimeout(resolve, 500));
                await machine.port.open({ baudRate });
            } catch (error) {
                console.error('Erreur lors de la mise à jour:', error);
                machine.status = 'error';
                machine.isConnected = false;
                notificationManager.show('Erreur lors de la mise à jour du port série.', 'error');
                this.updateDisplay();
                return;
            }
        }

        if (machine.uuid) {
            try {
                await this.saveMachineToDB(machine);
            } catch (error) {
                notificationManager.show('Impossible d\'enregistrer la machine.', 'error');
                machine.name = previousName;
                machine.baudRate = previousBaudRate;
                machine.infoCommands = previousCommands;
                this.updateDisplay();
                return;
            }
        }

        this.updateDisplay();
        notificationManager.show(`Machine ${name} mise à jour`, 'success');

        if (machine.isConnected && machine.port) {
            try {
                const syncResult = await this.collectAndPersistMachineInfo(machine, { silent: true });
                if (!syncResult || !Array.isArray(syncResult.results) || syncResult.results.length === 0) {
                    if (commandsChanged) {
                        notificationManager.show('Commandes enregistrées mais aucune donnée n\'a été renvoyée.', 'warning');
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la synchronisation après mise à jour:', error);
                if (commandsChanged) {
                    if (error.code === 'INFO_SYNC_IN_PROGRESS') {
                        notificationManager.show('Une synchronisation des informations est déjà en cours.', 'info');
                    } else {
                        notificationManager.show('Les commandes sont enregistrées mais la récupération des informations a échoué.', 'warning');
                    }
                }
            }
        } else if (commandsChanged) {
            notificationManager.show('Commandes enregistrées. Connectez la machine pour synchroniser les informations.', 'info');
        }
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

            this.stopConnectionMonitoring(machineId);
            if (this.readers.has(machineId)) {
                await this.stopReadingSerial(machineId);
            }

            if (machine.port) {
                await this.safeClosePort(machine.port);
            }
            machine.port = null;
            this.ports.delete(machineId);

            if (!('serial' in navigator)) {
                notificationManager.show('Web Serial API non supportée par ce navigateur', 'error');
                machine.status = 'disconnected';
                this.updateDisplay();
                return;
            }

            const { connected, hadAvailablePorts } = await this.connectUsingAuthorizedPorts(machine);
            if (connected) {
                return;
            }

            if (!hadAvailablePorts) {
                notificationManager.show('Sélectionnez un port série pour reconnecter la machine', 'info');
            }

            const port = await navigator.serial.requestPort();
            await this.connectMachineWithPort(machine, port);
        } catch (error) {
            console.error('Erreur de reconnexion:', error);

            machine.status = 'disconnected';
            machine.isConnected = false;
            machine.port = null;
            this.ports.delete(machineId);
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

        if (this.managerView && typeof this.managerView.showDeleteModal === 'function') {
            this.pendingDeletionMachine = machineId;
            this.managerView.setDeleteMachineName(machine.name || 'cette machine');
            this.managerView.showDeleteModal({ name: machine.name || 'cette machine' });
            return;
        }

        const fallbackConfirm =
            (typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(`Êtes-vous sûr de vouloir supprimer la machine "${machine.name}" ?`)) ||
            (typeof confirm === 'function' && confirm(`Êtes-vous sûr de vouloir supprimer la machine "${machine.name}" ?`));

        if (fallbackConfirm) {
            await this.performMachineDeletion(machineId);
        }
    }

    async executePendingDeletion() {
        if (!this.pendingDeletionMachine || !this.machines.has(this.pendingDeletionMachine)) {
            this.pendingDeletionMachine = null;
            this.managerView?.closeDeleteModal();
            notificationManager.show('Machine introuvable', 'error');
            return;
        }

        const machineId = this.pendingDeletionMachine;
        this.pendingDeletionMachine = null;
        await this.performMachineDeletion(machineId);
    }

    async performMachineDeletion(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            notificationManager.show('Machine introuvable', 'error');
            this.managerView?.closeDeleteModal();
            return;
        }

        this.managerView?.closeDeleteModal();

        try {
            if (machine.uuid) {
                const response = await fetch(`/api/machines/${machine.uuid}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.csrfHeaders()
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Erreur lors de la suppression en base de données');
                }
            }

            await this.teardownMachine(machineId, machine);
            notificationManager.show(`Machine ${machine.name} supprimée`, 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);

            if (error.message.includes('Machine non trouvée') || error.message.includes('404')) {
                await this.teardownMachine(machineId, machine);
                notificationManager.show(`Machine ${machine.name} supprimée (localement)`, 'success');
                return;
            }

            notificationManager.show(`Erreur lors de la suppression: ${error.message}`, 'error');
        }
    }

    async teardownMachine(machineId, machine = null) {
        const targetMachine = machine || this.machines.get(machineId);

        this.stopConnectionMonitoring(machineId);

        if (this.readers.has(machineId)) {
            await this.stopReadingSerial(machineId);
        }

        if (targetMachine && targetMachine.isConnected && targetMachine.port) {
            try {
                await targetMachine.port.close();
            } catch (error) {
                console.warn('Port déjà fermé ou en cours de fermeture:', error.message);
            }
        }

        this.machines.delete(machineId);
        this.ports.delete(machineId);
        this.readers.delete(machineId);
        this.infoCache.delete(machineId);
        if (this.currentInfoMachine === machineId) {
            this.resetInfoState();
        }

        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.tileView) {
            return;
        }
        this.tileView.render(this.machines);
    }

}
