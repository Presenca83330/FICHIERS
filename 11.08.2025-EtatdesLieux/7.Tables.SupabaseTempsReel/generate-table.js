/**
 * Générateur de documentation Supabase enrichie
 * Récupère : DDL, colonnes, contraintes, index, triggers, relations, policies RLS, fonctions liées etc
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = 'https://ksymahfrtvhnbeobsspt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeW1haGZydHZobmJlb2Jzc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMDkzMjYsImV4cCI6MjA2Njg4NTMyNn0.9h8LvZVtm_hixlec5E6d6rXyEZYx8nKzyiO6cWXYvhw';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Génère la documentation complète d'une table Supabase
 * @param {string} tableName - Nom de la table
 * @param {string} status - Statut de la table (actif, deprecated, etc.)
 * @param {string} type - Type de table (stratégique, opérationnelle, etc.)
 * @returns {Promise<string>} Documentation formatée en markdown
 */
async function generateTableDocumentation(tableName, status = 'actif', type = 'stratégique') {
  try {
    console.log(`🔄 Génération de la documentation pour la table: ${tableName}`);

    // 1. Définition SQL complète
    const { data: sqlDefinitionData, error: sqlError } = await supabase
      .rpc('gen_table_ddl', { p_schema: 'public', p_table: tableName });
    if (sqlError) throw new Error(`Erreur DDL: ${sqlError.message}`);
    const sqlDefinition = sqlDefinitionData || 'Définition SQL non disponible';

    // 2. Colonnes
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .order('ordinal_position');

    // 3. Contraintes
    const { data: constraints } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', tableName)
      .eq('table_schema', 'public');

    // 4. Index
    const { data: indexes } = await supabase
      .from('pg_indexes')
      .select('*')
      .eq('tablename', tableName);

    // 5. Triggers (utilise la fonction RPC créée)
    const { data: triggers } = await supabase
      .rpc('get_table_triggers', { p_table: tableName });

    // 6. Relations (FK)
    const { data: relations } = await supabase
      .from('information_schema.key_column_usage')
      .select('*')
      .eq('table_name', tableName)
      .eq('table_schema', 'public');

    // 7. Policies RLS
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', tableName)
      .eq('schemaname', 'public');

    // 8. Fonctions liées (requête SQL directe pour éviter les erreurs RPC)
    const { data: functions, error: functionsError } = await supabase
      .rpc('exec_sql', { 
        query: `
          SELECT 
            p.proname as function_name,
            CASE 
              WHEN p.prokind = 'f' THEN 'FUNCTION'
              WHEN p.prokind = 'p' THEN 'PROCEDURE'
              WHEN p.prokind = 't' THEN 'TRIGGER'
              ELSE 'OTHER'
            END as function_type,
            l.lanname as function_language,
            CASE 
              WHEN p.proname LIKE '%${tableName}%' THEN 'Fonction spécifique à la table'
              WHEN pg_get_functiondef(p.oid) ILIKE '%${tableName}%' THEN 'Utilise cette table'
              ELSE 'Fonction liée'
            END as description
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          JOIN pg_language l ON l.oid = p.prolang
          WHERE n.nspname = 'public' 
            AND (p.proname ILIKE '%${tableName}%' OR pg_get_functiondef(p.oid) ILIKE '%${tableName}%')
          ORDER BY p.proname
        `
      });
    
    if (functionsError) {
      console.warn(`⚠️ Erreur fonctions liées: ${functionsError.message}`);
    }

    // --- Construction Markdown ---
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    let md = `# Documentation Table: ${tableName}\n\n`;
    md += `**Date de génération:** ${currentDate}  \n**Statut:** ${status}  \n**Type:** ${type}\n\n---\n\n`;

    // 1. DDL
    md += `## 1. DÉFINITION SQL\n\`\`\`sql\n${sqlDefinition}\n\`\`\`\n\n---\n\n`;

    // 2. Colonnes
    md += `## 2. STRUCTURE DE LA TABLE\n\n| Colonne | Type | Nullable | Défaut | Description |\n|---------|------|----------|--------|-------------|\n`;
    if (columns?.length) {
      columns.forEach(col => {
        md += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable === 'YES' ? 'Oui' : 'Non'} | ${col.column_default || 'Aucun'} | - |\n`;
      });
    } else {
      md += `| - | - | - | - | - |\n`;
    }
    md += `\n---\n\n`;

    // 3. Contraintes
    md += `## 3. CONTRAINTES\n`;
    constraints?.forEach(c => {
      md += `- **${c.constraint_type}**: ${c.constraint_name}\n`;
    });
    md += `\n---\n\n`;

    // 4. Index
    md += `## 4. INDEX\n`;
    indexes?.forEach(idx => {
      md += `- ${idx.indexname}: ${idx.indexdef}\n`;
    });
    md += `\n---\n\n`;

    // 5. Triggers
    md += `## 5. TRIGGERS\n`;
    if (triggers?.length) {
      triggers.forEach(tg => {
        md += `- **${tg.trigger_name}** (${tg.trigger_timing} ${tg.trigger_event}): ${tg.trigger_function}\n`;
      });
    } else {
      md += `Aucun trigger trouvé\n`;
    }
    md += `\n---\n\n`;

    // 6. Relations
    md += `## 6. RELATIONS ENTRE TABLES (FK)\n`;
    if (relations?.length) {
      relations.forEach(r => {
        md += `- ${r.table_name}.${r.column_name} → ${r.constraint_name}\n`;
      });
    } else {
      md += `Aucune relation FK trouvée\n`;
    }
    md += `\n---\n\n`;

    // 7. Policies RLS
    md += `## 7. SÉCURITÉ RLS\n`;
    if (policies?.length) {
      policies.forEach(p => {
        md += `### ${p.policyname}\n- **Commande:** ${p.cmd}\n- **Rôles:** ${p.roles?.join(', ') || 'Tous'}\n- **Expression USING:** \`${p.qual || 'Aucune'}\`\n- **Expression WITH CHECK:** \`${p.with_check || 'Aucune'}\`\n\n`;
      });
    } else {
      md += `Aucune policy RLS trouvée\n`;
    }
    md += `\n---\n\n`;

    // 8. Fonctions liées
    md += `## 🔧 FONCTIONS LIÉES\n`;
    md += `**Fonctions utilisant cette table**\n\n`;
    if (functions?.length) {
      functions.forEach(fn => {
        md += `- **${fn.function_name}()**: ${fn.description}\n`;
      });
    } else {
      md += `Aucune fonction liée trouvée\n`;
    }
    md += `\n---\n\n`;

    // Notes techniques
    md += `## 9. NOTES TECHNIQUES\n- **Dernière mise à jour:** ${currentDate}\n- **Source:** Supabase Database (temps réel)\n- **Générateur:** Lovable AI Documentation Tool (enrichi)\n- **Fichier:** generate-table.js\n`;

    return md;

  } catch (error) {
    console.error(`❌ Erreur lors de la génération de la documentation:`, error);
    throw error;
  }
}

/**
 * Sauvegarde la documentation dans un fichier
 * @param {string} tableName - Nom de la table
 * @param {string} content - Contenu markdown
 * @param {string} outputDir - Répertoire de sortie
 */
function saveDocumentation(tableName, content, outputDir = './1.Tables.Stratégiques/') {
  const fileName = `${tableName}.md`;
  const filePath = path.join(__dirname, outputDir, fileName);
  
  // Créer le répertoire s'il n'existe pas
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Documentation sauvegardée: ${filePath}`);
}

/**
 * Fonction principale pour générer et sauvegarder la documentation
 * @param {string} tableName - Nom de la table
 * @param {string} status - Statut
 * @param {string} type - Type
 */
async function generateAndSaveTableDoc(tableName, status = 'actif', type = 'stratégique') {
  try {
    console.log(`🚀 Début de la génération pour: ${tableName}`);
    
    const documentation = await generateTableDocumentation(tableName, status, type);
    saveDocumentation(tableName, documentation);
    
    console.log(`🎉 Documentation générée avec succès pour: ${tableName}`);
    return documentation;
    
  } catch (error) {
    console.error(`💥 Erreur complète:`, error);
    throw error;
  }
}

// Export des fonctions
module.exports = {
  generateTableDocumentation,
  saveDocumentation,
  generateAndSaveTableDoc
};

// Usage en ligne de commande
if (require.main === module) {
  const args = process.argv.slice(2);
  const tableName = args[0];
  const status = args[1] || 'actif';
  const type = args[2] || 'stratégique';
  
  if (!tableName) {
    console.log('Usage: node generate-table.js <table_name> [status] [type]');
    console.log('Exemple: node generate-table.js users actif stratégique');
    process.exit(1);
  }
  
  generateAndSaveTableDoc(tableName, status, type)
    .then(() => {
      console.log('✨ Processus terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💀 Erreur fatale:', error);
      process.exit(1);
    });
}
