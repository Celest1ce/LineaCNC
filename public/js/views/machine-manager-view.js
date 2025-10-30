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
    consoleOutput: 'consoleOutput'
};

class MachineManagerView {
    constructor(customIds = {}) {
        this.ids = { ...DEFAULT_IDS, ...customIds };
        this.callbacks = {};
        this.documentClickHandler = this.handleDocumentClick.bind(this);
        this.cacheElements();
        this.bindEvents();
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
            consoleOutput: document.getElementById(this.ids.consoleOutput)
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
            consoleInput
        } = this.elements;

        if (addMachineBtn) {
            addMachineBtn.addEventListener('click', () => {
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
                    event.stopPropagation();
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
        return {
            name,
            baudRate: Number.isNaN(baudRateValue) ? null : baudRateValue
        };
    }

    showMachineModal({ name, baudRate } = {}) {
        const { machineModal } = this.elements;
        if (!machineModal) return;

        this.setMachineNameValue(name || '');
        this.setBaudrateValue(baudRate || '');
        this.validateBaudrateInput(this.elements.machineBaudRate?.value);
        machineModal.classList.remove('hidden');
        this.focusMachineName();
    }

    closeMachineModal() {
        const { machineModal } = this.elements;
        if (!machineModal) return;
        machineModal.classList.add('hidden');
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
        }
    }

    validateBaudrateInput(value) {
        const input = this.elements.machineBaudRate;
        if (!input) return;

        const numericValue = parseInt(value, 10);
        const isValid = !Number.isNaN(numericValue) && numericValue >= 1200 && numericValue <= 20000000;

        if (isValid) {
            input.style.borderColor = '';
            input.style.backgroundColor = '';
        } else {
            input.style.borderColor = '#EF4444';
            input.style.backgroundColor = '#FEF2F2';
        }
    }

    showConsoleModal() {
        const { consoleModal } = this.elements;
        if (!consoleModal) return;

        this.resetConsoleOutput();
        consoleModal.classList.remove('hidden');
        this.focusConsoleInput();
    }

    closeConsoleModal() {
        const { consoleModal } = this.elements;
        if (!consoleModal) return;
        consoleModal.classList.add('hidden');
        this.callbacks.onConsoleClosed?.();
    }

    resetConsoleOutput() {
        const { consoleOutput } = this.elements;
        if (!consoleOutput) return;
        consoleOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400">Console ouverte. En attente de données...</div>';
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
}

if (typeof window !== 'undefined') {
    window.MachineManagerView = MachineManagerView;
}

