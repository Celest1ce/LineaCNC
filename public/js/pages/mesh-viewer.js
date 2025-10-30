/**
 * Page Mesh Viewer - Point d'entrée
 */
class MeshViewerPage {
    constructor() {
        this.app = null;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        if (document.body.dataset.page === 'mesh-viewer') {
            this.app = new MeshViewerApp();
            window.meshViewerApp = this.app;
        }
    }
}

const meshViewerPage = new MeshViewerPage();
