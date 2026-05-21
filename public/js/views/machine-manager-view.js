const DEFAULT_IDS = {
    addMachineBtn: 'addMachineBtn',
    machineModal: 'machineModal',
    machineForm: 'machineForm',
    machineName: 'machineName',
    machineBaudRate: 'machineBaudRate',
    closeModal: 'closeModal',
    cancelModal: 'cancelBtn',
    baudrateDropdownBtn: 'baudrateDropdownBtn',
    baudrateDropdown: 'baudrateDropdown',
    consoleModal: 'consoleModal',
    closeConsoleModal: 'closeConsoleModal',
    sendConsoleBtn: 'sendConsoleBtn',
    consoleInput: 'consoleInput',
    consoleOutput: 'consoleOutput',
    machineInfoModal: 'machineInfoModal',
    closeMachineInfoModal: 'closeMachineInfoModal',
    refreshMachineInfo: 'refreshMachineInfo',
    machineInfoLastSync: 'machineInfoLastSync',
    machineInfoCommands: 'machineInfoCommands',
    machineInfoLoader: 'machineInfoLoader',
    machineInfoError: 'machineInfoError',
    machineInfoEmpty: 'machineInfoEmpty',
    machineInfoContent: 'machineInfoContent',
    machineInfoRefreshStatus: 'machineInfoRefreshStatus',
    machineInfoTitle: 'machineInfoTitle',
    serialSupportMessage: 'serialSupportMessage',
    deleteMachineModal: 'deleteMachineModal',
    closeDeleteMachineModal: 'closeDeleteMachineModal',
    cancelDeleteMachine: 'cancelDeleteMachine',
    confirmDeleteMachine: 'confirmDeleteMachine',
    deleteMachineName: 'deleteMachineName',
    machineBaudRateError: 'machineBaudRateError'
};

class MachineManagerView {
    constructor(customIds = {}) {
        this.ids = { ...DEFAULT_IDS, ...customIds };
        this.callbacks = {};
        this.documentClickHandler = this.handleDocumentClick.bind(this);
        this.boundModalKeydown = this.handleModalKeydown.bind(this);
        this.boundFocusIn = this.restrictFocusToModal.bind(this);
        this.activeModal = null;
        this.focusableElements = [];
        this.previouslyFocusedElement = null;
        this.cacheElements();
        this.bindEvents();
        this.updateSerialCapability();
    }

    cacheElements() {
        this.elements = {
            addMachineBtn: document.getElementById(this.ids.addMachineBtn),
            machineModal: document.getElementById(this.ids.machineModal),
            machineForm: document.getElementById(this.ids.machineForm),
            machineName: document.getElementById(this.ids.machineName),
            machineBaudRate: document.getElementById(this.ids.machineBaudRate),
            closeModal: document.getElementById(this.ids.closeModal),
            cancelModal: document.getElementById(this.ids.cancelModal),
            baudrateDropdownBtn: document.getElementById(this.ids.baudrateDropdownBtn),
            baudrateDropdown: document.getElementById(this.ids.baudrateDropdown),
            baudrateOptions: Array.from(document.querySelectorAll('.baudrate-option')),
            consoleModal: document.getElementById(this.ids.consoleModal),
            closeConsoleModal: document.getElementById(this.ids.closeConsoleModal),
            sendConsoleBtn: document.getElementById(this.ids.sendConsoleBtn),
            consoleInput: document.getElementById(this.ids.consoleInput),
            consoleOutput: document.getElementById(this.ids.consoleOutput),
            machineInfoModal: document.getElementById(this.ids.machineInfoModal),
            closeMachineInfoModal: document.getElementById(this.ids.closeMachineInfoModal),
            refreshMachineInfo: document.getElementById(this.ids.refreshMachineInfo),
            machineInfoLastSync: document.getElementById(this.ids.machineInfoLastSync),
            machineInfoCommands: document.getElementById(this.ids.machineInfoCommands),
            machineInfoLoader: document.getElementById(this.ids.machineInfoLoader),
            machineInfoError: document.getElementById(this.ids.machineInfoError),
            machineInfoEmpty: document.getElementById(this.ids.machineInfoEmpty),
            machineInfoContent: document.getElementById(this.ids.machineInfoContent),
            machineInfoRefreshStatus: document.getElementById(this.ids.machineInfoRefreshStatus),
            machineInfoTitle: document.getElementById(this.ids.machineInfoTitle),
            machineInfoCommandsInput: document.getElementById('machineInfoCommands'),
            serialSupportMessage: document.getElementById(this.ids.serialSupportMessage),
            deleteMachineModal: document.getElementById(this.ids.deleteMachineModal),
            closeDeleteMachineModal: document.getElementById(this.ids.closeDeleteMachineModal),
            cancelDeleteMachine: document.getElementById(this.ids.cancelDeleteMachine),
            confirmDeleteMachine: document.getElementById(this.ids.confirmDeleteMachine),
            deleteMachineName: document.getElementById(this.ids.deleteMachineName),
            machineBaudRateError: document.getElementById(this.ids.machineBaudRateError)
        };
    }

    setCallbacks(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    bindEvents() {
        const {
            addMachineBtn,
            machineModal,
            machineForm,
            closeModal,
            cancelModal,
            baudrateDropdownBtn,
            baudrateOptions,
            machineBaudRate,
            consoleModal,
            closeConsoleModal,
            sendConsoleBtn,
            consoleInput,
            machineInfoModal,
            closeMachineInfoModal,
            refreshMachineInfo
        } = this.elements;

        if (addMachineBtn) {
            addMachineBtn.addEventListener('click', () => {
                if (addMachineBtn.disabled) {
                    return;
                }
                this.callbacks.onRequestAddMachine?.();
            });
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeMachineModal());
        }

        if (cancelModal) {
            cancelModal.addEventListener('click', () => this.closeMachineModal());
        }

        if (machineModal) {
            machineModal.addEventListener('click', (event) => {
                if (event.target === machineModal) {
                    this.closeMachineModal();
                }
            });
        }

        if (machineForm) {
            machineForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const data = this.getFormData();
                this.callbacks.onMachineFormSubmit?.(data);
            });
        }

        if (baudrateDropdownBtn) {
            baudrateDropdownBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this.toggleBaudrateDropdown();
            });
        }

        if (Array.isArray(baudrateOptions)) {
            baudrateOptions.forEach((button) => {
                button.addEventListener('click', (event) => {
                    const value = event.currentTarget.getAttribute('data-baudrate');
                    this.setBaudrateValue(value);
                    this.validateBaudrateInput(value);
                    this.callbacks.onBaudratePresetSelected?.(value);
                    this.hideBaudrateDropdown();
                });
            });
        }

        document.addEventListener('click', this.documentClickHandler);

        if (machineBaudRate) {
            ['input', 'blur'].forEach((eventName) => {
                machineBaudRate.addEventListener(eventName, (event) => {
                    this.validateBaudrateInput(event.target.value);
                    this.callbacks.onBaudrateInput?.(event.target.value);
                });
            });
        }

        if (closeConsoleModal) {
            closeConsoleModal.addEventListener('click', () => this.closeConsoleModal());
        }

        if (consoleModal) {
            consoleModal.addEventListener('click', (event) => {
                if (event.target === consoleModal) {
                    this.closeConsoleModal();
                }
            });
        }

        if (sendConsoleBtn) {
            sendConsoleBtn.addEventListener('click', () => {
                const command = this.getConsoleInputValue();
                this.callbacks.onConsoleSend?.(command);
            });
        }

        if (consoleInput) {
            consoleInput.addEventListener('keydown', (event) => {
                if (event.ctrlKey && event.key === 'Enter') {
                    event.preventDefault();
                    const command = this.getConsoleInputValue();
                    this.callbacks.onConsoleSend?.(command);
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    this.callbacks.onConsoleNavigate?.('up');
                } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    this.callbacks.onConsoleNavigate?.('down');
                }
            });
        }

        if (closeMachineInfoModal) {
            closeMachineInfoModal.addEventListener('click', () => this.closeInfoModal());
        }

        if (machineInfoModal) {
            machineInfoModal.addEventListener('click', (event) => {
                if (event.target === machineInfoModal) {
                    this.closeInfoModal();
                }
            });
        }

        if (refreshMachineInfo) {
            refreshMachineInfo.addEventListener('click', () => {
                if (refreshMachineInfo.disabled) {
                    return;
                }
                this.callbacks.onInfoRefresh?.();
            });
        }

        if (this.elements.deleteMachineModal) {
            this.elements.deleteMachineModal.addEventListener('click', (event) => {
                if (event.target === this.elements.deleteMachineModal) {
                    this.closeDeleteModal();
                }
            });
        }

        if (this.elements.closeDeleteMachineModal) {
            this.elements.closeDeleteMachineModal.addEventListener('click', () => this.closeDeleteModal());
        }

        if (this.elements.cancelDeleteMachine) {
            this.elements.cancelDeleteMachine.addEventListener('click', () => this.handleDeleteCancelled());
        }

        if (this.elements.confirmDeleteMachine) {
            this.elements.confirmDeleteMachine.addEventListener('click', () => {
                this.callbacks.onDeleteConfirmed?.();
            });
        }
    }

    toggleBaudrateDropdown() {
        const dropdown = this.elements.baudrateDropdown;
        if (!dropdown) return;

        if (dropdown.classList.contains('hidden')) {
            dropdown.classList.remove('hidden');
            dropdown.classList.add('show');
        } else {
            this.hideBaudrateDropdown();
        }
    }

    hideBaudrateDropdown() {
        const dropdown = this.elements.baudrateDropdown;
        if (!dropdown) return;
        dropdown.classList.add('hidden');
        dropdown.classList.remove('show');
    }

    handleDocumentClick(event) {
        const { baudrateDropdown, baudrateDropdownBtn } = this.elements;
        if (!baudrateDropdown) return;

        const clickedInsideDropdown = baudrateDropdown.contains(event.target);
        const clickedButton = baudrateDropdownBtn?.contains(event.target);

        if (!clickedInsideDropdown && !clickedButton) {
            this.hideBaudrateDropdown();
        }
    }

    getFormData() {
        const name = this.elements.machineName?.value?.trim() || '';
        const baudRateValue = parseInt(this.elements.machineBaudRate?.value, 10);
        const commandsRaw = this.elements.machineInfoCommandsInput?.value || '';
        const infoCommands = commandsRaw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line, index, array) => line.length > 0 && array.indexOf(line) === index);
        return {
            name,
            baudRate: Number.isNaN(baudRateValue) ? null : baudRateValue,
            infoCommands
        };
    }

    showMachineModal({ name, baudRate, infoCommands } = {}) {
        const { machineModal, machineName } = this.elements;
        if (!machineModal) return;

        this.setMachineNameValue(name || '');
        this.setBaudrateValue(baudRate || '');
        this.validateBaudrateInput(this.elements.machineBaudRate?.value);
        if (this.elements.machineInfoCommandsInput) {
            const commandsValue = Array.isArray(infoCommands) && infoCommands.length
                ? infoCommands.join('\n')
                : '';
            this.elements.machineInfoCommandsInput.value = commandsValue;
        }
        this.openModal(machineModal, machineName);
    }

    closeMachineModal() {
        const { machineModal } = this.elements;
        if (!machineModal) return;
        this.closeModal(machineModal);
        this.callbacks.onMachineModalClosed?.();
    }

    focusMachineName() {
        const { machineName } = this.elements;
        if (machineName) {
            machineName.focus();
        }
    }

    setMachineNameValue(value) {
        if (this.elements.machineName) {
            this.elements.machineName.value = value;
        }
    }

    setBaudrateValue(value) {
        if (this.elements.machineBaudRate) {
            this.elements.machineBaudRate.value = value;
            this.clearBaudrateError();
        }
    }

    clearBaudrateError() {
        const { machineBaudRate, machineBaudRateError } = this.elements;
        if (machineBaudRateError) {
            machineBaudRateError.textContent = '';
            machineBaudRateError.classList.add('hidden');
        }
        if (machineBaudRate) {
            machineBaudRate.removeAttribute('aria-invalid');
            machineBaudRate.style.borderColor = '';
            machineBaudRate.style.backgroundColor = '';
        }
    }

    validateBaudrateInput(value) {
        const input = this.elements.machineBaudRate;
        const errorEl = this.elements.machineBaudRateError;
        if (!input) return;

        const numericValue = parseInt(value, 10);
        const isValid = !Number.isNaN(numericValue) && numericValue >= 1200 && numericValue <= 20000000;

        if (isValid) {
            input.removeAttribute('aria-invalid');
            input.style.borderColor = '';
            input.style.backgroundColor = '';
            if (errorEl) {
                errorEl.textContent = '';
                errorEl.classList.add('hidden');
            }
        } else {
            input.setAttribute('aria-invalid', 'true');
            input.style.borderColor = '#EF4444';
            input.style.backgroundColor = '#FEF2F2';
            if (errorEl) {
                errorEl.textContent = 'Entrez une valeur comprise entre 1200 et 20000000 baud.';
                errorEl.classList.remove('hidden');
            }
        }
    }

    showConsoleModal() {
        const { consoleModal, consoleInput } = this.elements;
        if (!consoleModal) return;

        this.resetConsoleOutput();
        this.openModal(consoleModal, consoleInput);
    }

    closeConsoleModal() {
        const { consoleModal } = this.elements;
        if (!consoleModal) return;
        this.closeModal(consoleModal);
        this.callbacks.onConsoleClosed?.();
    }

    resetConsoleOutput() {
        const { consoleOutput } = this.elements;
        if (!consoleOutput) return;
        consoleOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400">Console ouverte. En attente de données...</div>';
    }

    showInfoModal({ machineName, lastSyncLabel, commands } = {}) {
        const { machineInfoModal, refreshMachineInfo } = this.elements;
        if (!machineInfoModal) return;

        this.updateInfoMeta({ machineName, lastSyncLabel, commands });
        this.clearInfoModalError();
        this.hideInfoEmptyState();
        if (this.elements.machineInfoContent) {
            this.elements.machineInfoContent.innerHTML = '';
        }

        this.setInfoModalLoading(true);
        this.setInfoRefreshState(false);
        this.openModal(machineInfoModal, refreshMachineInfo);
    }

    closeInfoModal() {
        const { machineInfoModal } = this.elements;
        if (!machineInfoModal) return;
        this.setInfoRefreshState(false);
        this.closeModal(machineInfoModal);
        this.callbacks.onInfoModalClosed?.();
    }

    setInfoModalLoading(isLoading) {
        if (this.elements.machineInfoLoader) {
            this.elements.machineInfoLoader.classList.toggle('hidden', !isLoading);
        }
        if (this.elements.machineInfoContent) {
            this.elements.machineInfoContent.setAttribute('aria-busy', isLoading ? 'true' : 'false');
            if (isLoading) {
                this.elements.machineInfoContent.classList.add('opacity-50');
            } else {
                this.elements.machineInfoContent.classList.remove('opacity-50');
            }
        }
    }

    setInfoRefreshState(isRefreshing) {
        const { refreshMachineInfo, machineInfoRefreshStatus } = this.elements;
        if (refreshMachineInfo) {
            refreshMachineInfo.disabled = !!isRefreshing;
            refreshMachineInfo.classList.toggle('opacity-60', !!isRefreshing);
            refreshMachineInfo.classList.toggle('cursor-not-allowed', !!isRefreshing);
        }
        if (machineInfoRefreshStatus) {
            machineInfoRefreshStatus.classList.toggle('hidden', !isRefreshing);
        }
    }

    setInfoModalError(message) {
        if (!this.elements.machineInfoError) {
            return;
        }
        if (message) {
            this.elements.machineInfoError.textContent = message;
            this.elements.machineInfoError.classList.remove('hidden');
        } else {
            this.clearInfoModalError();
        }
    }

    clearInfoModalError() {
        if (!this.elements.machineInfoError) {
            return;
        }
        this.elements.machineInfoError.textContent = '';
        this.elements.machineInfoError.classList.add('hidden');
    }

    showInfoEmptyState() {
        if (this.elements.machineInfoEmpty) {
            this.elements.machineInfoEmpty.classList.remove('hidden');
        }
    }

    hideInfoEmptyState() {
        if (this.elements.machineInfoEmpty) {
            this.elements.machineInfoEmpty.classList.add('hidden');
        }
    }

    renderInfoModalContent(commandResults = []) {
        const { machineInfoContent } = this.elements;
        if (!machineInfoContent) return;

        machineInfoContent.innerHTML = '';

        if (!Array.isArray(commandResults) || commandResults.length === 0) {
            this.showInfoEmptyState();
            return;
        }

        this.hideInfoEmptyState();

        commandResults.forEach((result) => {
            const section = document.createElement('div');
            section.className = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/40 p-4 space-y-3';

            const header = document.createElement('div');
            header.className = 'flex flex-wrap items-center justify-between gap-2';

            const title = document.createElement('h4');
            title.className = 'text-sm font-semibold text-gray-900 dark:text-gray-100';
            title.textContent = result?.command || 'Commande';
            header.appendChild(title);

            if (result?.capturedAt) {
                const date = new Date(result.capturedAt);
                if (!Number.isNaN(date.getTime())) {
                    const dateEl = document.createElement('span');
                    dateEl.className = 'text-xs text-gray-500 dark:text-gray-400';
                    dateEl.textContent = date.toLocaleString('fr-FR');
                    header.appendChild(dateEl);
                }
            }

            section.appendChild(header);

            if (Array.isArray(result?.entries) && result.entries.length > 0) {
                const grid = document.createElement('div');
                grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3';

                result.entries.forEach((entry) => {
                    const card = document.createElement('div');
                    card.className = 'rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3';

                    const label = document.createElement('div');
                    label.className = 'text-xs font-semibold text-gray-700 dark:text-gray-200';
                    label.textContent = entry?.label || 'Paramètre';
                    card.appendChild(label);

                    if (entry?.parameter?.name) {
                        const normalized = document.createElement('div');
                        normalized.className = 'text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500';
                        normalized.textContent = entry.parameter.name;
                        card.appendChild(normalized);
                    }

                    const valueContainer = document.createElement('div');
                    valueContainer.className = 'mt-1 max-h-40 overflow-auto rounded bg-gray-100/70 px-2 py-1 text-sm text-gray-900 dark:bg-gray-900/40 dark:text-gray-100';

                    const value = document.createElement('pre');
                    value.className = 'whitespace-pre-wrap break-words font-sans text-sm';
                    const hasValue = entry?.value !== undefined && entry.value !== null && String(entry.value).trim().length > 0;
                    value.textContent = hasValue ? String(entry.value) : '—';

                    valueContainer.appendChild(value);
                    card.appendChild(valueContainer);

                    grid.appendChild(card);
                });

                section.appendChild(grid);
            } else {
                const empty = document.createElement('p');
                empty.className = 'text-xs text-gray-500 dark:text-gray-400';
                empty.textContent = 'Aucune donnée détaillée pour cette commande.';
                section.appendChild(empty);
            }

            if (result?.rawOutput) {
                const details = document.createElement('details');
                details.className = 'rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-3 py-2 text-xs text-gray-600 dark:text-gray-300';

                const summary = document.createElement('summary');
                summary.className = 'cursor-pointer text-xs font-medium text-blue-600 dark:text-blue-400';
                summary.textContent = 'Voir la réponse brute';
                details.appendChild(summary);

                const pre = document.createElement('pre');
                pre.className = 'mt-2 whitespace-pre-wrap break-words text-[11px] text-gray-600 dark:text-gray-300';
                pre.textContent = result.rawOutput;
                details.appendChild(pre);

                section.appendChild(details);
            }

            machineInfoContent.appendChild(section);
        });
    }

    updateInfoMeta({ machineName, lastSyncLabel, commands } = {}) {
        if (this.elements.machineInfoTitle) {
            const baseTitle = 'Informations machine';
            this.elements.machineInfoTitle.textContent = machineName
                ? `${baseTitle} · ${machineName}`
                : baseTitle;
        }
        if (this.elements.machineInfoLastSync) {
            this.elements.machineInfoLastSync.textContent = lastSyncLabel || 'Jamais';
        }
        if (this.elements.machineInfoCommands) {
            if (Array.isArray(commands) && commands.length > 0) {
                this.elements.machineInfoCommands.textContent = commands.join(' · ');
            } else if (typeof commands === 'string' && commands.trim().length > 0) {
                this.elements.machineInfoCommands.textContent = commands.trim();
            } else {
                this.elements.machineInfoCommands.textContent = '—';
            }
        }
    }

    appendToConsole(text, colorClass = 'text-green-400') {
        const { consoleOutput } = this.elements;
        if (!consoleOutput) return;
        const line = document.createElement('div');
        line.className = colorClass;
        line.textContent = text;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    getConsoleInputValue() {
        const value = this.elements.consoleInput?.value || '';
        return value.trim();
    }

    setConsoleInputValue(value) {
        if (this.elements.consoleInput) {
            this.elements.consoleInput.value = value;
        }
    }

    clearConsoleInput() {
        if (this.elements.consoleInput) {
            this.elements.consoleInput.value = '';
        }
    }

    focusConsoleInput() {
        if (this.elements.consoleInput) {
            this.elements.consoleInput.focus();
        }
    }

    showDeleteModal({ name } = {}) {
        const { deleteMachineModal } = this.elements;
        if (!deleteMachineModal) return;

        this.setDeleteMachineName(name || 'cette machine');
        this.openModal(deleteMachineModal, this.elements.confirmDeleteMachine);
    }

    closeDeleteModal() {
        const { deleteMachineModal } = this.elements;
        if (!deleteMachineModal) return;
        this.closeModal(deleteMachineModal);
    }

    handleDeleteCancelled() {
        this.closeDeleteModal();
        this.callbacks.onDeleteCancelled?.();
    }

    setDeleteMachineName(name) {
        if (this.elements.deleteMachineName) {
            this.elements.deleteMachineName.textContent = name;
        }
    }

    updateSerialCapability() {
        const { addMachineBtn, serialSupportMessage } = this.elements;
        const supported = typeof navigator !== 'undefined' && 'serial' in navigator;

        if (addMachineBtn) {
            addMachineBtn.disabled = !supported;
            if (supported) {
                addMachineBtn.removeAttribute('aria-disabled');
                addMachineBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                addMachineBtn.setAttribute('aria-disabled', 'true');
                addMachineBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }

        if (serialSupportMessage) {
            serialSupportMessage.classList.toggle('hidden', supported);
        }
    }

    openModal(modal, initialFocusElement) {
        if (!modal) return;

        this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('overflow-hidden');
        this.activeModal = modal;
        this.focusableElements = this.getFocusableElements(modal);

        const initialFocus = initialFocusElement && typeof initialFocusElement.focus === 'function'
            ? initialFocusElement
            : this.focusableElements[0];

        (initialFocus || modal).focus();

        modal.addEventListener('keydown', this.boundModalKeydown);
        document.addEventListener('focusin', this.boundFocusIn);
    }

    closeModal(modal) {
        if (!modal) return;

        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');

        if (this.activeModal === modal) {
            modal.removeEventListener('keydown', this.boundModalKeydown);
            document.removeEventListener('focusin', this.boundFocusIn);
            document.body.classList.remove('overflow-hidden');
            this.activeModal = null;
            this.focusableElements = [];

            if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
                this.previouslyFocusedElement.focus();
            }
            this.previouslyFocusedElement = null;
        }
    }

    handleModalKeydown(event) {
        if (!this.activeModal) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            if (this.activeModal === this.elements.machineModal) {
                this.closeMachineModal();
            } else if (this.activeModal === this.elements.consoleModal) {
                this.closeConsoleModal();
            } else if (this.activeModal === this.elements.machineInfoModal) {
                this.closeInfoModal();
            } else if (this.activeModal === this.elements.deleteMachineModal) {
                this.closeDeleteModal();
            }
            return;
        }

        if (event.key !== 'Tab' || this.focusableElements.length === 0) {
            return;
        }

        const first = this.focusableElements[0];
        const last = this.focusableElements[this.focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    restrictFocusToModal(event) {
        if (!this.activeModal || this.activeModal.contains(event.target)) {
            return;
        }

        const first = this.focusableElements[0];
        (first || this.activeModal).focus();
    }

    getFocusableElements(container) {
        if (!container) return [];
        return Array.from(
            container.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((element) => element.offsetParent !== null);
    }
}

if (typeof window !== 'undefined') {
    window.MachineManagerView = MachineManagerView;
}

