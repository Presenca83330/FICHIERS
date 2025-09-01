# 📋 DOCUMENTATION AUTOMATIQUE DES TABLES SUPABASE

Ce dossier contient la documentation automatiquement générée de toutes les tables Supabase de votre application **en temps réel**.

## 🎯 OBJECTIF

Avoir toujours accès à la **version courante** de chaque table avec :
- Structure complète (colonnes, types, contraintes)
- Triggers actifs
- Statut et policies RLS
- Relations entre tables
- **Mise à jour en temps réel depuis Supabase**

## 🚀 UTILISATION

### ✨ **NOUVEAU PROCESSUS IA LOVABLE (RECOMMANDÉ)**

Sur simple commande, l'IA Lovable peut maintenant :
- Mettre à jour **une ou plusieurs tables** en temps réel
- Récupérer les informations directement depuis Supabase
- Appliquer automatiquement le processus de documentation

**Exemple de commande :**
> "Mets à jour la documentation de la table users"
> "Génère la doc pour les tables users, organisations et reseau"

### Génération manuelle via script
```bash
# Depuis ce dossier
node generate-table.js <nom_table> [statut] [type]

```


## 📁 STRUCTURE ET FORMAT

Chaque table génère un fichier `{nom_table}.md` avec l'en-tête suivant :

```markdown
# Documentation Table: nom_table

**Date de génération:** date de la génération de l
**Statut:** actif|deprecated|maintenance  
**Type:** stratégique|opérationnelle|technique  
```

### Sections générées automatiquement :

#### 1. DÉFINITION SQL
- Code SQL complet de création de la table
- Généré via la fonction `gen_table_ddl()`

#### 2. STRUCTURE DE LA TABLE
- Liste complète des colonnes avec types
- Valeurs par défaut et contraintes nullables
- Tableau formaté markdown

#### 3. CONTRAINTES  
- Clés primaires et étrangères
- Contraintes CHECK et UNIQUE
- Contraintes de validation

#### 4. INDEX ⭐ *NOUVEAU*
- Tous les index de la table
- Définitions complètes des index
- Récupération via `pg_indexes`

#### 5. TRIGGERS ⭐ *AMÉLIORÉ*
- **Nouvelle fonction RPC** : `get_table_triggers()`
- Nom, événement, timing, fonction appelée
- Définition complète du trigger

#### 6. RELATIONS ENTRE TABLES (FK) ⭐ *NOUVEAU*
- Clés étrangères et références
- Mappage des relations entre tables
- Récupération via `information_schema.key_column_usage`

#### 7. SÉCURITÉ RLS
- Statut RLS (activé/forcé)
- Policies définies avec conditions
- Rôles et permissions d'accès

#### 8. FONCTIONS LIÉES ⭐ *NOUVEAU*
- **Nouvelle fonction RPC** : `get_table_functions()`
- Fonctions qui référencent la table
- Type de fonction et langage

#### 9. NOTES TECHNIQUES
- Métadonnées de génération
- Observations et remarques
- Source et horodatage

## 🔧 DONNÉES RÉCUPÉRÉES EN TEMPS RÉEL

Le générateur utilise directement Supabase pour récupérer :

1. **Définition SQL complète** : `gen_table_ddl(p_schema, p_table)`
2. **Structure** : `information_schema.columns`
3. **Contraintes** : `information_schema.table_constraints`
4. **Index** ⭐ : `pg_indexes`
5. **Triggers** ⭐ : `get_table_triggers(p_table)` *[nouvelle fonction RPC]*
6. **Relations FK** ⭐ : `information_schema.key_column_usage`
7. **Policies RLS** : `pg_policies`
8. **Fonctions liées** ⭐ : `get_table_functions(p_table)` *[nouvelle fonction RPC]*
9. **Métadonnées** : `information_schema.tables`

## 📊 TABLES DOCUMENTÉES

- ✅ organisations
- ✅ users  
- ✅ utilisateurs
- ✅ reseau
- ✅ reseau_agence
- ✅ reseau_direction
- ✅ reseau_agence_responsable
- ✅ reseau_agence_collaborateur
- ✅ agence_independante
- ✅ agence_independante_responsable
- ✅ agence_independante_collaborateur
- ✅ brevo_connexion
- ✅ linkedin_connexion
- ✅ facebook_connexion
- ✅ instagram_connexion
- ✅ openai_connexion
- ✅ zoho_connexion
- ✅ abonnement_stripe
- ✅ 1_historique_supabase

## 🔄 MISE À JOUR EN TEMPS RÉEL

### ⚡ **Via IA Lovable (OBLIGATOIRE)**



DIRECTIVE IMPERATIVE : 
Applique la fonction : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/generate-table.js pour chaque table l'une après l'autre
et donne en temps réel depuis Supabase les informations suivantes :  
- DÉFINITION SQL
- STRUCTURE DE LA TABLE
- CONTRAINTES
- INDEX
- TRIGGERS
- RELATIONS ENTRE TABLES (FK) 
- SÉCURITÉ RLS
- FONCTIONS LIÉES
- NOTES TECHNIQUES  

- Voici la liste des tables à documenter et leur emplacement et à remplir l'une après l'autre dans cet ordre :
  
    - 1.users.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/1.Tables.Stratégiques/1.users.md
    - 2.organisations.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/1.Tables.Stratégiques/2.organisations.md
    - 3.utilisateurs.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/1.Tables.Stratégiques/3.utilisateurs.md
 
    - 1.reseau.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/2.Tables.Clients/1.reseau.md
    - 2.reseau_direction.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/2.Tables.Clients/2.reseau_direction.md
    - 3.reseau_agence.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/2.Tables.Clients/3.reseau_agence.md
    - 4.reseau_agence_responsable.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/2.Tables.Clients/4.reseau_agence_responsable.md
    - 5.reseau_agence_collaborateur.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/2.Tables.Clients/5.reseau_agence_collaborateur.md
    - 6.agence_independante.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/2.Tables.Clients/6.agence_independante.md
    - 7.agence_independante_responsable.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/2.Tables.Clients/7.agence_independante_responsable.md
    - 8.agence_independante_collaborateur.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/2.Tables.Clients/8.agence_independante_collaborateur.md
 
    - 1.brevo_connexion.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/3.Tables.Connexion/1.brevo_connexion.md
    - 2.zoho_connexion.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/3.Tables.Connexion/2.zoho_connexion.md
    - 3.openai_connexion.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/3.Tables.Connexion/3.openai_connexion.md
    - 4.linkedin_connexion.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/3.Tables.Connexion/4.linkedin_connexion.md
    - 5.facebook_connexion.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/3.Tables.Connexion/5.facebook_connexion.md
    - 6.instagram_connexion.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/3.Tables.Connexion/6.instagram_connexion.md
    - 7.abonnement_stripe.md  : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/3.Tables.Connexion/7.abonnement_stripe.md
 
    - 1.1_historique_supabase.md : public/11.08.2025-EtatdesLieux/7.Tables.SupabaseTempsReel/4.Tables.Historique/1.1_historique_supabase.md


### 📝 **Via Script Manuel** Non Utilisé
```bash
node generate-table.js nom_table [statut] [type]
```

### 🎯 **Statuts disponibles**
- `actif` : Table en production active
- `deprecated` : Table obsolète à migrer  
- `maintenance` : Table en cours de modification

### 🏷️ **Types disponibles**
- `stratégique` : Tables métier principales
- `opérationnelle` : Tables de gestion/admin
- `technique` : Tables système/logs

---

## 🚀 **PROCESSUS IA TEMPS RÉEL ACTIVÉ**

L'IA Lovable peut maintenant :
✅ Récupérer les données Supabase en direct  
✅ Générer la documentation complète  
✅ Sauvegarder automatiquement les fichiers  
✅ Appliquer le format standardisé  

**Plus besoin d'exécuter manuellement les scripts !**

---

*Documentation générée automatiquement par Lovable AI Documentation Tool*
