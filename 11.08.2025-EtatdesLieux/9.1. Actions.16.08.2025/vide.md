# Documentation Table: users

**Date de génération:** 17/08/2025  
**Statut:** ✅ ACTIVE  
**Type:** Table stratégique - Générée automatiquement  

---

## 1. DÉFINITION SQL

```sql
/* SQL Definition generated from catalogs */
/* Owner: postgres | Tablespace: pg_default | RLS: enabled */

CREATE TABLE public.users (
  users_id uuid NOT NULL DEFAULT gen_random_uuid(),
  users_auth_id uuid NOT NULL,
  users_email text NOT NULL,
  users_nom text NOT NULL,
  users_prenom text NOT NULL,
  users_telephone text,
  users_organisation_id uuid,
  users_role text NOT NULL DEFAULT 'client'::text,
  users_role_systeme text,
  users_interface_par_defaut text DEFAULT 'client_espace'::text,
  users_created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT check_users_interface_par_defaut CHECK (users_interface_par_defaut = ANY (ARRAY['client_espace'::text, 'admin_presenca'::text])),
  CONSTRAINT check_users_role CHECK (users_role = ANY (ARRAY['client'::text, 'admin'::text])),
  CONSTRAINT fk_users_auth_id FOREIGN KEY (users_auth_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_users_organisation FOREIGN KEY (users_organisation_id) REFERENCES organisations(organisation_id) ON DELETE RESTRICT,
  CONSTRAINT users_organisation_id_fkey FOREIGN KEY (users_organisation_id) REFERENCES organisations(organisation_id) ON DELETE CASCADE,
  CONSTRAINT users_pkey PRIMARY KEY (users_id),
  CONSTRAINT users_users_auth_id_fkey FOREIGN KEY (users_auth_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT users_users_email_key UNIQUE (users_email),
  CONSTRAINT users_users_role_systeme_check CHECK ((users_role_systeme = ANY (ARRAY['admin_presenca'::text, 'superadmin'::text, 'support'::text])) OR users_role_systeme IS NULL)
);
```

---

## 2. STRUCTURE DE LA TABLE

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| users_id | uuid | Non | gen_random_uuid() | 🔑 Identifiant unique |
| users_auth_id | uuid | Non | Aucun | 🔗 Référence auth.users |
| users_email | text | Non | Aucun | Email utilisateur (unique) |
| users_nom | text | Non | Aucun | Nom de famille |
| users_prenom | text | Non | Aucun | Prénom |
| users_telephone | text | Oui | Aucun | Numéro de téléphone |
| users_organisation_id | uuid | Oui | Aucun | 🔗 Organisation de rattachement |
| users_role | text | Non | 'client' | Rôle utilisateur |
| users_role_systeme | text | Oui | Aucun | Rôle système avancé |
| users_interface_par_defaut | text | Oui | 'client_espace' | Interface par défaut |
| users_created_at | timestamp with time zone | Non | now() | Date de création |

---

## 3. CONTRAINTES

### Clés primaires et étrangères
- **PRIMARY KEY**: users_pkey (users_id)
- **FOREIGN KEY**: fk_users_auth_id → auth.users(id) ON DELETE CASCADE
- **FOREIGN KEY**: fk_users_organisation → organisations(organisation_id) ON DELETE RESTRICT
- **FOREIGN KEY**: users_organisation_id_fkey → organisations(organisation_id) ON DELETE CASCADE ⚠️
- **FOREIGN KEY**: users_users_auth_id_fkey → auth.users(id) ON DELETE CASCADE ⚠️
- **UNIQUE**: users_users_email_key (users_email)

### Contraintes CHECK
- **check_users_role**: Rôle ('client', 'admin')
- **check_users_interface_par_defaut**: Interface ('client_espace', 'admin_presenca')
- **users_users_role_systeme_check**: Rôle système ('admin_presenca', 'superadmin', 'support' ou NULL)

---

## 4. INDEX

- **idx_users_auth_id**: UNIQUE INDEX sur users_auth_id
- **idx_users_email**: UNIQUE INDEX sur users_email ⚠️
- **idx_users_organisation_id**: INDEX sur users_organisation_id
- **idx_users_role_systeme**: INDEX sur users_role_systeme
- **users_pkey**: PRIMARY KEY UNIQUE INDEX sur users_id
- **users_users_email_key**: UNIQUE INDEX sur users_email ⚠️

---

## 5. TRIGGERS

- **sync_users_to_utilisateurs** (AFTER UPDATE): EXECUTE FUNCTION sync_users_utilisateurs()
- **users_insert_audit** (BEFORE INSERT): EXECUTE FUNCTION set_created_audit_fields_users()
- **users_update_audit** (BEFORE UPDATE): EXECUTE FUNCTION update_audit_fields_users()

---

## 6. RELATIONS ENTRE TABLES (FK)

### Relations sortantes
- **users.users_auth_id** → auth.users.id (CASCADE) ⚠️ DUPLIQUÉE
- **users.users_organisation_id** → organisations.organisation_id (RESTRICT + CASCADE) ⚠️ CONFLICTUELLE

### Relations entrantes
- Toutes les tables avec colonnes `_created_by` et `_updated_by` référencent users.users_id

---

## 7. SÉCURITÉ RLS

**RLS Activée:** ✅ OUI

### Policies RLS

#### 1. Admin PRESENCA full access
- **Commande:** ALL
- **Rôles:** authenticated
- **Expression USING:** `is_admin_presenca(auth.uid())`
- **Expression WITH CHECK:** `is_admin_presenca(auth.uid())`

#### 2. Users can update their own profile
- **Commande:** UPDATE
- **Rôles:** authenticated
- **Expression USING:** `(users_auth_id = auth.uid())`
- **Expression WITH CHECK:** `(users_auth_id = auth.uid())`

#### 3. Users can view their own profile
- **Commande:** SELECT
- **Rôles:** authenticated
- **Expression USING:** `(users_auth_id = auth.uid())`
- **Expression WITH CHECK:** Aucune

---

## 8. FONCTIONS LIÉES

⚠️ **Erreur dans get_table_functions()**: Fonction RPC défaillante (erreur aggregate)
Fonctions connues utilisant cette table :
- **get_user_organisation_id()**: Récupère l'organisation d'un utilisateur
- **is_admin_presenca()**: Vérifie si un utilisateur est admin PRESENCA
- **get_current_user_role()**: Récupère le rôle système de l'utilisateur connecté
- **set_created_audit_fields_users()**: Trigger d'insertion
- **update_audit_fields_users()**: Trigger de mise à jour
- **sync_users_utilisateurs()**: Synchronisation bidirectionnelle avec table utilisateurs

---

## 9. NOTES TECHNIQUES

### ⚠️ PROBLÈMES DÉTECTÉS (confirmés par audit temps réel)

1. **Contraintes FK dupliquées/conflictuelles** :
   - users_auth_id : 2 FK vers auth.users(id) 
   - users_organisation_id : 2 FK vers organisations (RESTRICT + CASCADE)

2. **Index doublons** :
   - idx_users_email + users_users_email_key (même colonne)

3. **Fonction RPC cassée** :
   - get_table_functions() génère une erreur aggregate

### ✅ Points positifs
- RLS correctement configurées
- Triggers de synchronisation opérationnels
- Contraintes CHECK bien définies
- Structure stable et fonctionnelle

### Recommandations
1. Nettoyer les FK et index dupliqués
2. Corriger la fonction get_table_functions()
3. Documenter le pattern de synchronisation users/utilisateurs

---

**Dernière mise à jour:** 17/08/2025  
**Source:** Supabase Database (temps réel)  
**Générateur:** Lovable AI Documentation Tool (test generate-table.js)  
**Statut:** ⚠️ Incohérences détectées mais table fonctionnelle
