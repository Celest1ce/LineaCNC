# 🎯 Icônes - LineaCNC

Dossier contenant toutes les icônes de l'interface utilisateur.

## 📁 Structure recommandée

### Interface
- `icon-dashboard.svg` - Tableau de bord
- `icon-settings.svg` - Paramètres
- `icon-user.svg` - Utilisateur
- `icon-logout.svg` - Déconnexion
- `icon-admin.svg` - Administration

### Machines CNC
- `icon-machine.svg` - Machine CNC
- `icon-connect.svg` - Connexion
- `icon-disconnect.svg` - Déconnexion
- `icon-play.svg` - Démarrer
- `icon-pause.svg` - Pause
- `icon-stop.svg` - Arrêter

### Actions
- `icon-add.svg` - Ajouter
- `icon-edit.svg` - Modifier
- `icon-delete.svg` - Supprimer
- `icon-save.svg` - Sauvegarder
- `icon-cancel.svg` - Annuler

### Statuts
- `icon-success.svg` - Succès
- `icon-warning.svg` - Avertissement
- `icon-error.svg` - Erreur
- `icon-info.svg` - Information

## 🎨 Spécifications

### Format SVG (recommandé)
- **Taille** : 24x24px (base)
- **Couleurs** : Utiliser les variables CSS du thème
- **Style** : Outline ou filled selon le contexte
- **Optimisé** : Code SVG nettoyé

### Tailles multiples
- `icon-[nom]-16.svg` - 16x16px
- `icon-[nom]-20.svg` - 20x20px
- `icon-[nom]-24.svg` - 24x24px (base)
- `icon-[nom]-32.svg` - 32x32px

## 🎯 Guidelines

### Style cohérent
- **Épaisseur** : 2px pour les outlines
- **Rayons** : 2px pour les coins arrondis
- **Espacement** : 2px minimum entre les éléments
- **Alignement** : Centré dans le viewBox

### Couleurs
- **Primaire** : #3B82F6 (blue-500)
- **Secondaire** : #6B7280 (gray-500)
- **Succès** : #10B981 (green-500)
- **Avertissement** : #F59E0B (yellow-500)
- **Erreur** : #EF4444 (red-500)

## 🔧 Intégration

```html
<!-- Icône simple -->
<svg class="icon icon-24">
  <use href="/assets/images/icons/icon-settings.svg#icon"></use>
</svg>

<!-- Icône avec couleur -->
<svg class="icon icon-24 text-blue-500">
  <use href="/assets/images/icons/icon-machine.svg#icon"></use>
</svg>
```

## 📦 Sources recommandées

- **Heroicons** : https://heroicons.com/
- **Lucide** : https://lucide.dev/
- **Feather** : https://feathericons.com/
- **Tabler Icons** : https://tabler-icons.io/
