# Migrations de Base de Données

Ce dossier contient les scripts de migration pour la base de données LineaCNC.

## Utilisation

### Migration UUID Constraint

Permet à plusieurs utilisateurs d'avoir des machines avec le même UUID en modifiant la contrainte d'unicité.

**Commande :**
```bash
node src/config/migrations/migrate-uuid-constraint.js
```

**Ce que fait cette migration :**
1. Vérifie que la table `machines` existe
2. Supprime l'ancienne contrainte `UNIQUE` sur `uuid` seule
3. Crée une nouvelle contrainte composite `UNIQUE (user_id, uuid)`
4. Affiche un rapport détaillé de la structure finale

**Avant la migration :**
- Un UUID ne peut exister qu'**une seule fois** dans toute la base de données
- Si deux utilisateurs ont une machine avec le même UUID, le système met à jour la première au lieu de créer une nouvelle entrée

**Après la migration :**
- Chaque utilisateur peut avoir ses propres machines avec le même UUID
- Les paramètres et informations ne sont **pas partagés** entre utilisateurs
- La contrainte composite garantit qu'un utilisateur ne peut avoir qu'une seule machine avec un UUID donné

## Notes

- Les migrations sont **idempotentes** : elles peuvent être exécutées plusieurs fois sans problème
- Le script vérifie automatiquement l'état actuel avant d'appliquer les changements
- Les erreurs sont gérées gracieusement avec des messages clairs

## Structure des migrations

Chaque fichier de migration doit :
1. Exporter une fonction avec le nom `migrate[NomMigration]`
2. Gérer les erreurs proprement
3. Afficher des logs clairs sur l'état de la migration
4. Libérer les connexions à la base de données
5. Retourner `true` en cas de succès, `false` en cas d'échec
