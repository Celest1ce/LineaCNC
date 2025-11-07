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
            consoleInput
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
        return {
            name,
            baudRate: Number.isNaN(baudRateValue) ? null : baudRateValue
        };
    }

    showMachineModal({ name, baudRate } = {}) {
        const { machineModal, machineName } = this.elements;
        if (!machineModal) return;

        this.setMachineNameValue(name || '');
        this.setBaudrateValue(baudRate || '');
        this.validateBaudrateInput(this.elements.machineBaudRate?.value);
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

