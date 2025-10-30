const SVG_NS = 'http://www.w3.org/2000/svg';

const MACHINE_TILE_STATUS_META = {
    connected: {
        label: 'Connectée',
        badgeClass: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
    },
    connecting: {
        label: 'Connexion...',
        badgeClass: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900'
    },
    retrieving: {
        label: 'Récupération des informations...',
        badgeClass: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900'
    },
    ready: {
        label: 'Prête',
        badgeClass: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
    },
    disconnected: {
        label: 'Non connecté',
        badgeClass: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
    },
    error: {
        label: 'Erreur',
        badgeClass: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'
    }
};

const MACHINE_TILE_ICONS = {
    machine: ['M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'],
    settings: [
        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 01.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    ],
    console: ['M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
    trash: ['M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16']
};

class MachineTileView {
    constructor({ containerId = 'machinesGrid', emptyStateId = 'noMachinesMessage' } = {}) {
        this.containerId = containerId;
        this.emptyStateId = emptyStateId;
        this.callbacks = {};
    }

    setCallbacks(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    render(machines) {
        const grid = document.getElementById(this.containerId);
        const noMachinesMessage = document.getElementById(this.emptyStateId);

        if (!grid) return;

        grid.innerHTML = '';

        const list = machines instanceof Map
            ? Array.from(machines.values())
            : Array.isArray(machines)
                ? machines
                : [];

        if (list.length === 0) {
            if (noMachinesMessage) {
                noMachinesMessage.classList.remove('hidden');
            }
            return;
        }

        if (noMachinesMessage) {
            noMachinesMessage.classList.add('hidden');
        }

        const fragment = document.createDocumentFragment();

        list.forEach((machine) => {
            fragment.appendChild(this.createMachineTile(machine));
        });

        grid.appendChild(fragment);
    }

    createMachineTile(machine) {
        const tile = this.createElement('div', 'card p-4 flex flex-col gap-3 hover:shadow-lg transition-shadow duration-200');

        tile.append(
            this.buildTileHeader(machine),
            this.buildTileDetails(machine)
        );

        const footer = this.buildTileFooter(machine);
        if (footer) {
            tile.appendChild(footer);
        }

        return tile;
    }

    buildTileHeader(machine) {
        const header = this.createElement('div', 'flex items-start justify-between gap-3');

        const identity = this.createElement('div', 'flex items-start gap-2');
        const iconWrapper = this.createElement('div', 'p-1.5 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/40 dark:text-blue-300');
        iconWrapper.appendChild(this.createIcon(MACHINE_TILE_ICONS.machine, 'h-4 w-4'));
        identity.appendChild(iconWrapper);

        const info = this.createElement('div', 'min-w-0');
        info.append(
            this.createElement('h3', 'text-sm font-semibold text-gray-900 dark:text-gray-100 truncate', machine.name),
            this.createElement('p', 'text-xs text-gray-500 dark:text-gray-400', `${machine.baudRate} baud`)
        );
        identity.appendChild(info);

        header.appendChild(identity);

        const status = MACHINE_TILE_STATUS_META[machine.status] || MACHINE_TILE_STATUS_META.disconnected;
        const badge = this.createElement('span', `px-2 py-1 text-xs font-semibold rounded-full ${status.badgeClass}`, status.label);

        const actions = this.createElement('div', 'flex items-center gap-1');

        actions.appendChild(this.createIconButton({
            title: 'Paramètres',
            icon: this.createIcon(MACHINE_TILE_ICONS.settings, 'h-3 w-3'),
            className: 'p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors',
            onClick: () => this.callbacks.onEdit?.(machine.id)
        }));

        if (machine.status === 'ready') {
            actions.appendChild(this.createIconButton({
                title: 'Console Serial',
                icon: this.createIcon(MACHINE_TILE_ICONS.console, 'h-3 w-3'),
                className: 'p-1 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors',
                onClick: () => this.callbacks.onOpenConsole?.(machine.id)
            }));
        }

        actions.appendChild(this.createIconButton({
            title: 'Supprimer',
            icon: this.createIcon(MACHINE_TILE_ICONS.trash, 'h-3 w-3'),
            className: 'p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors',
            onClick: () => this.callbacks.onDelete?.(machine.id)
        }));

        const rightSide = this.createElement('div', 'flex items-start gap-2');
        rightSide.appendChild(badge);
        rightSide.appendChild(actions);
        header.appendChild(rightSide);

        return header;
    }

    buildTileDetails(machine) {
        const details = this.createElement('div', 'space-y-2');

        const activityRow = this.createElement('div', 'flex items-center justify-between');
        activityRow.append(
            this.createElement('span', 'text-xs font-medium text-gray-700 dark:text-gray-300', 'Activité :'),
            this.createElement(
                'span',
                'text-xs text-gray-500 dark:text-gray-400',
                machine.lastSeen ? this.formatTime(typeof machine.lastSeen === 'string' ? new Date(machine.lastSeen) : machine.lastSeen) : '—'
            )
        );

        details.appendChild(activityRow);

        if (machine.uuid) {
            const uuidSection = this.createElement('div', 'mt-2 pt-2 border-t border-gray-200 dark:border-gray-800');
            const uuidBox = this.createElement('div', 'rounded-lg bg-gray-100 px-2 py-1.5 dark:bg-gray-900');
            uuidBox.append(
                this.createElement('div', 'text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5', 'UUID Firmware'),
                this.createElement('div', 'text-xs font-mono text-gray-800 break-all dark:text-gray-200', machine.uuid)
            );
            uuidSection.appendChild(uuidBox);
            details.appendChild(uuidSection);
        }

        return details;
    }

    buildTileFooter(machine) {
        const base = this.createElement('div', 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-800');

        if (machine.status === 'ready') {
            const actions = this.createElement('div', 'flex gap-2');
            const disconnectBtn = this.createFooterButton('Déconnecter', 'secondary', () => this.callbacks.onDisconnect?.(machine.id));
            disconnectBtn.classList.add('flex-1');
            const controlBtn = this.createFooterButton('Contrôler', 'primary');
            controlBtn.classList.add('flex-1');
            actions.append(disconnectBtn, controlBtn);
            base.appendChild(actions);
            return base;
        }

        if (machine.status === 'disconnected') {
            const action = machine.needsAuthorization
                ? () => this.callbacks.onAuthorize?.(machine.id)
                : () => this.callbacks.onConnect?.(machine.id);
            const connectBtn = this.createFooterButton(
                machine.needsAuthorization ? 'Autoriser le port' : 'Connecter',
                'primary',
                action
            );
            connectBtn.classList.add('w-full');
            base.appendChild(connectBtn);
            return base;
        }

        if (machine.status === 'connecting' || machine.status === 'retrieving') {
            const message = machine.status === 'connecting' ? 'Connexion en cours...' : 'Récupération des informations...';
            base.appendChild(this.createElement('div', 'w-full text-center text-xs py-1.5 text-gray-500 dark:text-gray-400', message));
            return base;
        }

        if (machine.status === 'error') {
            const action = machine.lastError === 'NotAllowedError'
                ? () => this.callbacks.onAuthorize?.(machine.id)
                : () => this.callbacks.onRetry?.(machine.id);
            const retryBtn = this.createFooterButton(
                machine.lastError === 'NotAllowedError' ? 'Autoriser le port' : 'Réessayer',
                'primary',
                action
            );
            retryBtn.classList.add('w-full');
            base.appendChild(retryBtn);
            return base;
        }

        return null;
    }

    createIconButton({ title, icon, className, onClick }) {
        const button = this.createElement('button', className);
        button.type = 'button';
        button.title = title;
        button.appendChild(icon);
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        return button;
    }

    createFooterButton(label, variant, onClick) {
        const variantClass = variant === 'secondary' ? 'btn-secondary' : 'btn-primary';
        const button = this.createElement('button', `${variantClass} text-xs py-1.5 rounded-lg`);
        button.type = 'button';
        button.textContent = label;
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        return button;
    }

    createIcon(paths, size) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('class', size);

        paths.forEach((d) => {
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-width', '2');
            svg.appendChild(path);
        });

        return svg;
    }

    createElement(tag, className, textContent) {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (typeof textContent === 'string') {
            element.textContent = textContent;
        }
        return element;
    }

    formatTime(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return 'Jamais';
        }

        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return "À l'instant";
        if (minutes < 60) return `Il y a ${minutes}min`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Il y a ${hours}h`;

        return date.toLocaleDateString('fr-FR');
    }
}

if (typeof window !== 'undefined') {
    window.MachineTileView = MachineTileView;
}

