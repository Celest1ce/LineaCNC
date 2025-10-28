/**
 * Gestionnaire des machines CNC
 */
class MachineManager {
    constructor() {
        this.machines = new Map();
        this.ports = new Map();
        this.currentEditingMachine = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateDisplay();
    }

    bindEvents() {
        const addMachineBtn = document.getElementById('addMachineBtn');
        const modal = document.getElementById('machineModal');
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const form = document.getElementById('machineForm');

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
                isConnected: false
            };

            // Ajouter à la liste
            this.machines.set(machineId, machine);
            this.ports.set(machineId, port);

            // Mettre à jour l'affichage
            this.updateDisplay();

            // Simuler la connexion
            setTimeout(() => {
                machine.status = 'connected';
                machine.isConnected = true;
                machine.lastSeen = new Date();
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

    disconnectMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        try {
            machine.port.close();
            machine.status = 'disconnected';
            machine.isConnected = false;
            this.updateDisplay();
            notificationManager.show(`Machine ${machine.name} déconnectée`, 'info');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        }
    }

    async reconnectMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        try {
            machine.status = 'connecting';
            this.updateDisplay();

            // Rouvrir le port
            await machine.port.open({ baudRate: machine.baudRate });

            // Simuler la reconnexion
            setTimeout(() => {
                machine.status = 'connected';
                machine.isConnected = true;
                machine.lastSeen = new Date();
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} reconnectée`, 'success');
            }, 2000);

        } catch (error) {
            machine.status = 'error';
            this.updateDisplay();
            notificationManager.show(`Erreur de reconnexion: ${machine.name}`, 'error');
        }
    }

    removeMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        if (confirm(`Êtes-vous sûr de vouloir supprimer la machine "${machine.name}" ?`)) {
            try {
                if (machine.isConnected) {
                    machine.port.close();
                }
                this.machines.delete(machineId);
                this.ports.delete(machineId);
                this.updateDisplay();
                notificationManager.show(`Machine ${machine.name} supprimée`, 'info');
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
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
