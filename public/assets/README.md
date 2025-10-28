# 📁 Assets - LineaCNC

Ce dossier contient tous les assets statiques de l'application LineaCNC.

## 🗂️ Structure des dossiers

```
public/assets/
├── images/                 # Images et graphiques
│   ├── logos/             # Logos de l'application
│   ├── icons/             # Icônes et pictogrammes
│   └── backgrounds/       # Images de fond
├── fonts/                 # Polices personnalisées
├── documents/             # Documents PDF, guides, etc.
└── downloads/             # Fichiers téléchargeables
```

## 📋 Conventions de nommage

### Images
- **Logos** : `logo-[nom]-[taille].png` (ex: `logo-lineacnc-256.png`)
- **Icônes** : `icon-[nom]-[taille].svg` (ex: `icon-settings-24.svg`)
- **Backgrounds** : `bg-[nom]-[résolution].jpg` (ex: `bg-hero-1920x1080.jpg`)

### Polices
- **Format** : `.woff2` (priorité), `.woff`, `.ttf`
- **Nommage** : `[nom-police]-[style]-[poids].woff2`

### Documents
- **Guides** : `guide-[nom].pdf`
- **Manuels** : `manual-[version].pdf`
- **Templates** : `template-[nom].pdf`

## 🎨 Formats recommandés

### Images
- **Logos** : PNG avec transparence, SVG pour la vectorisation
- **Icônes** : SVG (préférable) ou PNG 24x24, 32x32, 48x48
- **Photos** : JPG pour les photos, PNG pour les graphiques
- **Résolutions** : 1x, 2x, 3x pour le responsive

### Polices
- **Web** : WOFF2 (priorité), WOFF, TTF
- **Fallback** : Système (Inter, Arial, sans-serif)

## 📏 Tailles recommandées

### Logos
- **Favicon** : 16x16, 32x32, 48x48
- **Header** : 120x40 (max)
- **Footer** : 80x30 (max)
- **Social** : 1200x630 (Open Graph)

### Icônes
- **Interface** : 16x16, 20x20, 24x24
- **Boutons** : 16x16, 20x20
- **Navigation** : 24x24, 32x32

## 🚀 Optimisation

- **Compression** : Images optimisées (TinyPNG, ImageOptim)
- **Lazy loading** : Pour les images lourdes
- **Responsive** : Images adaptatives selon la taille d'écran
- **Cache** : Headers de cache appropriés

## 📝 Notes

- Tous les assets doivent être optimisés pour le web
- Respecter les droits d'auteur
- Tester sur différents navigateurs et appareils
- Maintenir une cohérence visuelle
