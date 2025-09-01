#!/usr/bin/env node

/**
 * GÉNÉRATEUR DE DÉFINITION SQL COMPLÈTE DES TABLES
 * Génère le CREATE TABLE complet avec colonnes, contraintes et index
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

// Scripts SQL pour récupérer la définition complète
const SQL_QUERIES = {
  // 1. Structure des colonnes
  columns: (tableName) => `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${tableName}'
    ORDER BY ordinal_position
  `,

  // 2. Contraintes (PK, FK, CHECK, UNIQUE)
  constraints: (tableName) => `
    SELECT 
      tc.constraint_name,
      tc.constraint_type,
      pg_get_constraintdef(pgc.oid) as definition,
      kcu.column_name,
      ccu.table_name as foreign_table_name,
      ccu.column_name as foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN pg_constraint pgc ON tc.constraint_name = pgc.conname
    LEFT JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = '${tableName}'
    ORDER BY tc.constraint_type, tc.constraint_name
  `,

  // 3. Index
  indexes: (tableName) => `
    SELECT 
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = '${tableName}'
    AND indexname NOT LIKE '%_pkey'
    ORDER BY indexname
  `
};

// Formatage des types de données
function formatDataType(col) {
  let type = col.data_type;
  
  if (type === 'character varying') {
    type = col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'varchar';
  } else if (type === 'numeric' && col.numeric_precision) {
    type = col.numeric_scale ? 
      `numeric(${col.numeric_precision},${col.numeric_scale})` : 
      `numeric(${col.numeric_precision})`;
  } else if (type === 'timestamp without time zone') {
    type = 'timestamp';
  } else if (type === 'timestamp with time zone') {
    type = 'timestamp with time zone';
  }
  
  return type;
}

// Formatage d'une colonne
function formatColumn(col) {
  let line = `  ${col.column_name} ${formatDataType(col)}`;
  
  // NULL/NOT NULL
  line += col.is_nullable === 'YES' ? ' NULL' : ' NOT NULL';
  
  // DEFAULT
  if (col.column_default) {
    line += ` DEFAULT ${col.column_default}`;
  }
  
  return line;
}

// Génération de la définition SQL complète
async function generateSqlDefinition(tableName) {
  console.log(`🔧 Génération SQL pour: ${tableName}`);
  
  try {
    // Exécution des requêtes
    const [columnsResult, constraintsResult, indexesResult] = await Promise.all([
      supabase.rpc('exec_sql', { query: SQL_QUERIES.columns(tableName) }),
      supabase.rpc('exec_sql', { query: SQL_QUERIES.constraints(tableName) }),
      supabase.rpc('exec_sql', { query: SQL_QUERIES.indexes(tableName) })
    ]);

    if (!columnsResult.data || columnsResult.data.length === 0) {
      throw new Error(`Table ${tableName} non trouvée`);
    }

    let sql = '';
    
    // En-tête du CREATE TABLE
    sql += `-- Table: ${tableName}\n`;
    sql += `-- Générée le: ${new Date().toISOString()}\n\n`;
    sql += `CREATE TABLE public."${tableName}" (\n`;
    
    // Colonnes
    const columns = columnsResult.data;
    const columnLines = columns.map(col => formatColumn(col));
    
    // Contraintes inline (PK, UNIQUE, CHECK, FK)
    const constraints = constraintsResult.data || [];
    const constraintLines = [];
    
    constraints.forEach(constraint => {
      if (constraint.constraint_type === 'PRIMARY KEY') {
        constraintLines.push(`  CONSTRAINT ${constraint.constraint_name} ${constraint.definition}`);
      } else if (constraint.constraint_type === 'FOREIGN KEY') {
        constraintLines.push(`  CONSTRAINT ${constraint.constraint_name} ${constraint.definition}`);
      } else if (constraint.constraint_type === 'CHECK') {
        constraintLines.push(`  CONSTRAINT ${constraint.constraint_name} ${constraint.definition}`);
      } else if (constraint.constraint_type === 'UNIQUE') {
        constraintLines.push(`  CONSTRAINT ${constraint.constraint_name} ${constraint.definition}`);
      }
    });
    
    // Assemblage final avec virgules
    const allLines = [...columnLines, ...constraintLines];
    sql += allLines.join(',\n');
    
    sql += `\n) TABLESPACE pg_default;\n`;
    
    // Index séparés
    const indexes = indexesResult.data || [];
    if (indexes.length > 0) {
      sql += '\n-- Index\n';
      indexes.forEach(index => {
        sql += `${index.indexdef};\n`;
      });
    }
    
    return sql;

  } catch (error) {
    console.error(`❌ Erreur lors de la génération SQL pour ${tableName}:`, error);
    return null;
  }
}

// Génération pour une table spécifique
async function generateTableSql(tableName, outputFile = null) {
  const sql = await generateSqlDefinition(tableName);
  
  if (!sql) {
    console.error(`❌ Impossible de générer le SQL pour ${tableName}`);
    return;
  }
  
  if (outputFile) {
    await fs.writeFile(outputFile, sql, 'utf8');
    console.log(`✅ SQL généré: ${outputFile}`);
  } else {
    console.log('\n' + '='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
  }
}

// Génération pour toutes les tables
async function generateAllTablesSql() {
  console.log('🚀 Génération SQL de toutes les tables...\n');
  
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

    // Création du dossier SQL
    const sqlDir = path.join(process.cwd(), 'public/11.08.2025-EtatdesLieux/8.SQL-Definitions');
    await fs.mkdir(sqlDir, { recursive: true });

    // Génération pour chaque table
    for (const table of tables) {
      const tableName = table.table_name;
      const sql = await generateSqlDefinition(tableName);
      
      if (sql) {
        const filePath = path.join(sqlDir, `${tableName}.sql`);
        await fs.writeFile(filePath, sql, 'utf8');
        console.log(`✅ ${tableName} -> ${tableName}.sql`);
      }
    }

    console.log(`\n🎉 Définitions SQL générées dans: ${sqlDir}`);

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Interface en ligne de commande
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node generate-sql-definition.js <table_name> [output_file]');
    console.log('  node generate-sql-definition.js --all');
    console.log('');
    console.log('Exemples:');
    console.log('  node generate-sql-definition.js users');
    console.log('  node generate-sql-definition.js users users.sql');
    console.log('  node generate-sql-definition.js --all');
    return;
  }
  
  if (args[0] === '--all') {
    await generateAllTablesSql();
  } else {
    const tableName = args[0];
    const outputFile = args[1];
    await generateTableSql(tableName, outputFile);
  }
}

// Exécution
if (require.main === module) {
  main();
}

module.exports = { generateSqlDefinition, generateTableSql, generateAllTablesSql };
