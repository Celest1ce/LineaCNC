# 🔤 Polices - LineaCNC

Dossier contenant les polices personnalisées de l'application.

## 📁 Structure

### Polices principales
- `Inter/` - Police principale (Google Fonts)
- `Montserrat/` - Police alternative
- `Roboto/` - Police de fallback

### Formats
- `.woff2` - Format moderne (priorité)
- `.woff` - Format de fallback
- `.ttf` - Format de compatibilité

## 🎨 Polices utilisées

### Inter (Principale)
- **Usage** : Interface utilisateur, textes
- **Styles** : 300, 400, 500, 600, 700
- **Source** : Google Fonts
- **Fallback** : system-ui, sans-serif

### Montserrat (Alternative)
- **Usage** : Titres, éléments spéciaux
- **Styles** : 300, 400, 500, 600, 700
- **Source** : Google Fonts
- **Fallback** : Inter, sans-serif

## 🔧 Intégration

### CSS
```css
@font-face {
  font-family: 'Inter';
  src: url('/assets/fonts/Inter/Inter-Regular.woff2') format('woff2'),
       url('/assets/fonts/Inter/Inter-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### HTML
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

## 📏 Tailles recommandées

### Interface
- **Texte** : 14px (base), 16px (mobile)
- **Titres** : 18px, 24px, 32px, 48px
- **Boutons** : 14px, 16px
- **Navigation** : 16px, 18px

### Hiérarchie
- **H1** : 2.25rem (36px)
- **H2** : 1.875rem (30px)
- **H3** : 1.5rem (24px)
- **H4** : 1.25rem (20px)
- **H5** : 1.125rem (18px)
- **H6** : 1rem (16px)
- **Body** : 0.875rem (14px)

## ⚡ Optimisation

### Performance
- **Preload** : Polices critiques
- **Font-display** : swap pour éviter le FOIT
- **Subset** : Caractères nécessaires uniquement
- **Compression** : Gzip/Brotli

### Chargement
```html
<link rel="preload" href="/assets/fonts/Inter/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
```

## 🎯 Guidelines

### Lisibilité
- **Contraste** : Minimum 4.5:1
- **Espacement** : line-height 1.5-1.6
- **Largeur** : 45-75 caractères par ligne

### Cohérence
- **Hiérarchie** : Tailles cohérentes
- **Poids** : Utilisation logique des graisses
- **Style** : Uniformité dans l'interface
