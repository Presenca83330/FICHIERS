#!/usr/bin/env node

/**
 * GÉNÉRATEUR AUTOMATIQUE DE DOCUMENTATION TABLES SUPABASE
 * Utilise vos 5 scripts SQL pour créer/mettre à jour la documentation MD
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration Supabase
const SUPABASE_URL = 'https://ksymahfrtvhnbeobsspt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d\'environnement');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// VOS 5 SCRIPTS SQL
const SQL_SCRIPTS = {
  structure: (tableName) => `
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns
    WHERE table_name = '${tableName}' 
    ORDER BY ordinal_position
  `,
  
  constraints: (tableName) => `
    SELECT conname, contype, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = '${tableName}'
  `,
  
  triggers: (tableName) => `
    SELECT tgname, tgtype, tgenabled, pg_get_triggerdef(oid)
    FROM pg_trigger
    WHERE tgrelid = '${tableName}'::regclass
  `,
  
  rlsStatus: (tableName) => `
    SELECT relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relname = '${tableName}'
  `,
  
  rlsPolicies: (tableName) => `
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = '${tableName}'
  `
};

// Utilitaires de formatage
const formatConstraintType = (type) => {
  const types = { 'p': 'PRIMARY KEY', 'f': 'FOREIGN KEY', 'c': 'CHECK', 'u': 'UNIQUE' };
  return types[type] || type;
};

const formatDataType = (type) => {
  return type.replace('character varying', 'varchar').replace('timestamp without time zone', 'timestamp');
};

const formatBoolean = (val) => val ? '✅ OUI' : '❌ NON';

const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Génération du contenu MD
async function generateTableDoc(tableName) {
  console.log(`📋 Génération documentation pour: ${tableName}`);
  
  try {
    // Exécution parallèle des 5 scripts
    const [structure, constraints, triggers, rlsStatus, rlsPolicies] = await Promise.all([
      supabase.rpc('exec_sql', { query: SQL_SCRIPTS.structure(tableName) }),
      supabase.rpc('exec_sql', { query: SQL_SCRIPTS.constraints(tableName) }),
      supabase.rpc('exec_sql', { query: SQL_SCRIPTS.triggers(tableName) }),
      supabase.rpc('exec_sql', { query: SQL_SCRIPTS.rlsStatus(tableName) }),
      supabase.rpc('exec_sql', { query: SQL_SCRIPTS.rlsPolicies(tableName) })
    ]);

    // Construction du document MD
    let md = `# TABLE: ${tableName}\n\n`;
    md += `**Date de génération:** ${new Date().toISOString().split('T')[0]}\n`;
    md += `**Statut:** ✅ ACTIVE\n`;
    md += `**Type:** Table métier\n\n`;
    md += `---\n\n`;

    // 1. STRUCTURE
    md += `## 📋 STRUCTURE DE LA TABLE\n\n`;
    md += `| Colonne | Type | Nullable | Défaut | Description |\n`;
    md += `|---------|------|----------|--------|-------------|\n`;
    
    if (structure.data) {
      structure.data.forEach(col => {
        const icon = col.column_name.includes('_id') ? '🔑 ' : '';
        md += `| ${col.column_name} | ${formatDataType(col.data_type)} | ${col.is_nullable} | ${col.column_default || '-'} | ${icon}${col.column_name.replace(/_/g, ' ')} |\n`;
      });
    }
    md += `\n---\n\n`;

    // 2. CONTRAINTES
    md += `## 🔒 CONTRAINTES\n\n`;
    if (constraints.data && constraints.data.length > 0) {
      const pkConstraints = constraints.data.filter(c => c.contype === 'p');
      const fkConstraints = constraints.data.filter(c => c.contype === 'f');
      const checkConstraints = constraints.data.filter(c => c.contype === 'c');
      const uniqueConstraints = constraints.data.filter(c => c.contype === 'u');

      if (pkConstraints.length > 0) {
        md += `### Clés primaires\n`;
        pkConstraints.forEach(c => md += `- **${c.conname}**: ${c.definition}\n`);
        md += `\n`;
      }

      if (fkConstraints.length > 0) {
        md += `### Clés étrangères\n`;
        fkConstraints.forEach(c => md += `- **${c.conname}**: ${truncateText(c.definition)}\n`);
        md += `\n`;
      }

      if (checkConstraints.length > 0) {
        md += `### Contraintes CHECK\n`;
        checkConstraints.forEach(c => md += `- **${c.conname}**: ${truncateText(c.definition)}\n`);
        md += `\n`;
      }

      if (uniqueConstraints.length > 0) {
        md += `### Contraintes UNIQUE\n`;
        uniqueConstraints.forEach(c => md += `- **${c.conname}**: ${c.definition}\n`);
        md += `\n`;
      }
    } else {
      md += `Aucune contrainte définie.\n\n`;
    }
    md += `---\n\n`;

    // 3. TRIGGERS
    md += `## ⚡ TRIGGERS\n\n`;
    if (triggers.data && triggers.data.length > 0) {
      triggers.data.forEach(t => {
        md += `### ${t.tgname}\n`;
        md += `- **Type:** ${t.tgtype}\n`;
        md += `- **Activé:** ${t.tgenabled === 'O' ? '✅ OUI' : '❌ NON'}\n`;
        md += `- **Définition:** ${truncateText(t.pg_get_triggerdef)}\n\n`;
      });
    } else {
      md += `Aucun trigger défini.\n\n`;
    }
    md += `---\n\n`;

    // 4. SÉCURITÉ RLS
    md += `## 🛡️ SÉCURITÉ RLS\n\n`;
    if (rlsStatus.data && rlsStatus.data.length > 0) {
      const rls = rlsStatus.data[0];
      md += `**RLS Activée:** ${formatBoolean(rls.relrowsecurity)}\n`;
      md += `**RLS Forcée:** ${formatBoolean(rls.relforcerowsecurity)}\n\n`;
    }

    // 5. POLICIES RLS
    if (rlsPolicies.data && rlsPolicies.data.length > 0) {
      md += `### Policies RLS\n\n`;
      rlsPolicies.data.forEach((policy, index) => {
        md += `#### ${index + 1}. ${policy.policyname}\n`;
        md += `- **Type:** ${policy.cmd}\n`;
        md += `- **Rôles:** ${Array.isArray(policy.roles) ? policy.roles.join(', ') : policy.roles}\n`;
        if (policy.qual) md += `- **Condition:** \`${policy.qual}\`\n`;
        if (policy.with_check) md += `- **Vérification:** \`${policy.with_check}\`\n`;
        md += `\n`;
      });
    } else {
      md += `### Aucune policy RLS définie\n\n`;
    }

    md += `---\n\n`;
    md += `## 🎯 NOTES TECHNIQUES\n\n`;
    md += `*Documentation générée automatiquement le ${new Date().toISOString()}*\n`;

    return md;

  } catch (error) {
    console.error(`❌ Erreur lors de la génération pour ${tableName}:`, error);
    return null;
  }
}

// Fonction principale
async function generateAllDocs() {
  console.log('🚀 Démarrage génération documentation tables...\n');
  
  try {
    // Récupération de toutes les tables
    const { data: tables } = await supabase.rpc('exec_sql', {
      query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    });

    if (!tables) {
      console.error('❌ Impossible de récupérer la liste des tables');
      return;
    }

    console.log(`📊 ${tables.length} tables trouvées\n`);

    // Création du dossier de documentation
    const docsDir = path.join(process.cwd(), 'public/11.08.2025-EtatdesLieux/7.Tables-Documentation');
    await fs.mkdir(docsDir, { recursive: true });

    // Génération pour chaque table
    for (const table of tables) {
      const tableName = table.table_name;
      const doc = await generateTableDoc(tableName);
      
      if (doc) {
        const filePath = path.join(docsDir, `TABLE-${tableName}.md`);
        await fs.writeFile(filePath, doc, 'utf8');
        console.log(`✅ ${tableName} -> TABLE-${tableName}.md`);
      }
    }

    console.log(`\n🎉 Documentation générée avec succès dans: ${docsDir}`);

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  generateAllDocs();
}

module.exports = { generateAllDocs, generateTableDoc };
