# Base de données - Prisma

Ce dossier contient le schéma de base de données et les migrations Prisma.

## 🚀 Démarrage rapide

### Première fois (créer les tables)

```bash
# Depuis le dossier racine du projet
npm run prisma:migrate -w apps/api
```

Cette commande va :
1. Créer les tables dans votre base de données
2. Créer le dossier `migrations/` avec l'historique
3. Générer le client Prisma

### Après avoir modifié le schéma

```bash
# Créer une nouvelle migration
npm run prisma:migrate -w apps/api
```

Donnez un nom descriptif à votre migration (ex: "add_user_role_field")

## 📝 Scripts disponibles

### Développement

```bash
# Créer et appliquer une migration (dev)
npm run prisma:migrate -w apps/api

# Créer une migration sans l'appliquer
npm run prisma:migrate:create -w apps/api

# Pousser les changements sans créer de migration (prototypage rapide)
npm run db:push -w apps/api

# Ouvrir Prisma Studio (interface graphique)
npm run prisma:studio -w apps/api

# Réinitialiser la base de données (ATTENTION: supprime toutes les données)
npm run prisma:reset -w apps/api
```

### Production

```bash
# Déployer les migrations (utilisé automatiquement au start)
npm run prisma:deploy -w apps/api

# Générer le client Prisma
npm run prisma:generate -w apps/api
```

## 🔄 Workflow de développement

1. **Modifier le schéma** (`schema.prisma`)
   ```prisma
   model User {
     id String @id @default(cuid())
     // Ajoutez vos champs ici
   }
   ```

2. **Créer la migration**
   ```bash
   npm run prisma:migrate -w apps/api
   ```

3. **Les tables sont automatiquement mises à jour** ✅

## 🏭 Déploiement en production

Les migrations sont **automatiquement déployées** au démarrage :

```bash
npm run start -w apps/api
```

Le script `start` exécute `prisma:deploy` avant de lancer le serveur.

## 📊 Structure actuelle

```
prisma/
├── schema.prisma          # Schéma de la base de données
└── migrations/            # Historique des migrations (créé après la première migration)
    └── YYYYMMDDHHMMSS_nom/
        └── migration.sql
```

## ⚠️ Important

- **Ne jamais** modifier les fichiers de migration existants
- **Toujours** créer une nouvelle migration pour les changements
- **Tester** les migrations en dev avant de déployer en production
- Les migrations sont versionnées avec git

## 🔗 Documentation Prisma

- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
