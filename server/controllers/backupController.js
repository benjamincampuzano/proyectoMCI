const { execSync, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { Client } = require('pg');

const parseDatabaseUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return {
            host: urlObj.hostname,
            port: parseInt(urlObj.port) || 5432,
            user: urlObj.username,
            password: urlObj.password,
            database: urlObj.pathname.replace('/', '')
        };
    } catch (error) {
        console.error("Error parsing database URL:", error);
        throw new Error("Invalid database URL format");
    }
};

const findPgExecutable = (exeName) => {
    const envVar = exeName === 'pg_dump' ? process.env.PG_DUMP_PATH : process.env.PG_RESTORE_PATH;
    if (envVar && fs.existsSync(envVar)) return envVar;

    try {
        const whereCmd = process.platform === 'win32' ? `where ${exeName}` : `which ${exeName}`;
        const output = execSync(whereCmd, { encoding: 'utf8' }).split('\n')[0].trim();
        if (output && fs.existsSync(output)) return output;
    } catch (e) {
        // Ignore
    }

    if (process.platform === 'win32') {
        const versions = ['18', '17', '16', '15', '14', '13'];
        for (const v of versions) {
            const fullPath = `C:\\Program Files\\PostgreSQL\\${v}\\bin\\${exeName}.exe`;
            if (fs.existsSync(fullPath)) return fullPath;
        }
    }

    return exeName;
};

const generateSqlBackup = async (databaseUrl, filePath) => {
    const dbConfig = parseDatabaseUrl(databaseUrl);
    const pgDumpPath = findPgExecutable('pg_dump');
    
    const ssl = process.env.NODE_ENV === 'production' ? 'require' : 'disable';
    
    try {
        console.log("📦 Generando backup SQL con pg_dump...");
        
        execFileSync(pgDumpPath, [
            '--host', dbConfig.host,
            '--port', dbConfig.port.toString(),
            '--username', dbConfig.user,
            '--dbname', dbConfig.database,
            '--inserts',
            '--no-owner',
            '--no-privileges',
            '--no-tablespaces',
            '--file', filePath
        ], {
            env: {
                ...process.env,
                PGPASSWORD: dbConfig.password,
                PGSSLMODE: ssl
            }
        });
        
        console.log("✅ Backup SQL generado exitosamente");
    } catch (error) {
        console.error("❌ Error con pg_dump, intentando con cliente Node.js:", error.message);
        await generateSqlBackupWithNodeClient(databaseUrl, filePath);
    }
};

const generateSqlBackupWithNodeClient = async (databaseUrl, filePath) => {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        await client.connect();
        console.log("📦 Generando backup con cliente Node.js...");
        
        const tablesResult = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' AND tablename NOT IN ('spatial_ref_sys', '_prisma_migrations')
            ORDER BY tablename
        `);
        
        const tables = tablesResult.rows.map(row => row.tablename);
        console.log(`📊 Tablas encontradas: ${tables.length}`);
        
        let sqlContent = "-- Backup generado automáticamente\n";
        sqlContent += "-- Fecha: " + new Date().toISOString() + "\n";
        sqlContent += "-- Formato: SQL plano compatible con PostgreSQL\n\n";
        
        for (const table of tables) {
            console.log(`📝 Procesando tabla: ${table}`);
            
            const createResult = await client.query(`
                SELECT pg_get_constraintdef(conid) as constraint_def,
                       pg_get_indexdef(idxid) as index_def
                FROM (
                    SELECT conid, conname, pg_get_constraintdef(conid) 
                    FROM pg_constraint 
                    WHERE contype = 'f' AND conrelid = $1::regclass
                ) AS fk
                JOIN (
                    SELECT indexrelid, indexrelname, pg_get_indexdef(indexrelid) 
                    FROM pg_index 
                    WHERE indrelid = $1::regclass AND indisprimary
                ) AS pk ON 1=1
            `, [table]).catch(() => ({ rows: [] }));
            
            const createTableResult = await client.query(`
                SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [table]);
            
            if (createTableResult.rows.length > 0) {
                sqlContent += `-- ===== Tabla: ${table} =====\n`;
                
                const columns = createTableResult.rows.map(col => {
                    let def = `${col.column_name} ${col.data_type}`;
                    if (col.character_maximum_length) {
                        def += `(${col.character_maximum_length})`;
                    }
                    if (col.column_default) def += ` DEFAULT ${col.column_default}`;
                    if (col.is_nullable === 'NO') def += ' NOT NULL';
                    return def;
                });
                
                sqlContent += `DROP TABLE IF EXISTS ${table} CASCADE;\n`;
                sqlContent += `CREATE TABLE ${table} (\n  ${columns.join(',\n  ')}\n);\n\n`;
                
                const dataResult = await client.query(`SELECT * FROM ${table}`);
                
                if (dataResult.rows.length > 0) {
                    for (const row of dataResult.rows) {
                        const cols = Object.keys(row);
                        const vals = cols.map(col => {
                            const val = row[col];
                            if (val === null) return 'NULL';
                            if (typeof val === 'number') return val;
                            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                            if (val instanceof Date) return `'${val.toISOString()}'`;
                            if (Buffer.isBuffer(val)) return `'\\x${val.toString('hex')}'`;
                            return `'${String(val).replace(/'/g, "''")}'`;
                        });
                        sqlContent += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
                    }
                }
                
                sqlContent += "\n";
            }
        }
        
        fs.writeFileSync(filePath, sqlContent, 'utf8');
        console.log(`✅ Backup SQL generado: ${filePath} (${fs.statSync(filePath).size} bytes)`);
        
    } catch (error) {
        console.error("❌ Error generando backup:", error);
        throw error;
    } finally {
        await client.end();
    }
};

const executeSqlFileWithTransaction = async (databaseUrl, filePath, res) => {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        statement_timeout: 300000,
        query_timeout: 300000
    });
    
    try {
        console.log("🔄 Conectando a la base de datos...");
        await client.connect();
        
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        console.log(`📁 Archivo SQL leído: ${sqlContent.length} caracteres`);
        
        await client.query('BEGIN');
        console.log("📝 Transacción iniciada");
        
        const statements = sqlContent
            .split(/;\s*$/m)
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--') && stmt.length > 0);
        
        console.log(`📊 Ejecutando ${statements.length} sentencias...`);
        
        let executed = 0;
        let lastProgress = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement) {
                try {
                    await client.query(statement);
                    executed++;
                    
                    const progress = Math.floor((executed / statements.length) * 100);
                    if (progress - lastProgress >= 10) {
                        console.log(`📈 Progreso: ${progress}% (${executed}/${statements.length})`);
                        lastProgress = progress;
                    }
                } catch (stmtError) {
                    console.warn(`⚠️ Error en sentencia ${i + 1}: ${stmtError.message.substring(0, 100)}`);
                    console.warn(`   Sentencia: ${statement.substring(0, 100)}...`);
                }
            }
        }
        
        await client.query('COMMIT');
        console.log("✅ Transacción confirmada");
        
        return { success: true, executed };
        
    } catch (error) {
        console.error("❌ Error en restauración, ejecutando ROLLBACK...");
        try {
            await client.query('ROLLBACK');
            console.log("🔄 Rollback ejecutado");
        } catch (rollbackError) {
            console.error("❌ Error en rollback:", rollbackError);
        }
        throw error;
    } finally {
        await client.end();
        console.log("🔌 Conexión cerrada");
    }
};

const downloadBackup = async (req, res) => {
    try {
        const DATABASE_URL = process.env.PG_DUMP_URL || process.env.DATABASE_URL;

        if (!DATABASE_URL) {
            return res.status(500).json({ error: "DATABASE_URL no está definida" });
        }

        const backupsDir = path.join(__dirname, "../backups");

        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
        const filePath = path.join(backupsDir, fileName);

        console.log("🚀 Iniciando generación de backup...");
        await generateSqlBackup(DATABASE_URL, filePath);

        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error("Error al enviar el archivo:", err);
            }
            
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("Error al eliminar archivo temporal:", unlinkErr);
            });
        });
    } catch (error) {
        console.error("Error en downloadBackup:", error);
        return res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

const restoreBackup = async (req, res) => {
    const tempFilePath = null;
    
    try {
        const DATABASE_URL = process.env.PG_DUMP_URL || process.env.DATABASE_URL;

        if (!DATABASE_URL) {
            return res.status(500).json({ error: "DATABASE_URL no está definida" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Debes proporcionar un archivo de backup" });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        
        console.log(`📂 Archivo recibido: ${fileName} (${req.file.size} bytes)`);
        
        if (!fileName.toLowerCase().endsWith('.sql')) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ 
                error: "Formato no válido",
                details: "Solo se aceptan archivos .sql. Por favor descarga un backup en formato SQL e intenta nuevamente."
            });
        }

        const maxSize = 100 * 1024 * 1024;
        if (req.file.size > maxSize) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ 
                error: "Archivo demasiado grande",
                details: `Máximo permitido: 100MB. Tu archivo: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`
            });
        }

        console.log("🔄 Iniciando restauración...");
        
        const result = await executeSqlFileWithTransaction(DATABASE_URL, filePath, res);

        fs.unlinkSync(filePath);
        console.log("🗑️ Archivo temporal eliminado");

        return res.status(200).json({ 
            message: "Base de datos restaurada exitosamente",
            statementsExecuted: result.executed
        });

    } catch (error) {
        console.error("❌ Error en restoreBackup:", error);
        
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {}
        }

        return res.status(500).json({ 
            error: "Error al restaurar la base de datos",
            details: error.message
        });
    }
};

module.exports = {
    downloadBackup,
    restoreBackup
};
