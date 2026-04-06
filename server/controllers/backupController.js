const { execSync, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
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

const getTableDependencies = async (client) => {
    const dependencies = {};
    
    // Obtener todas las foreign keys
    const fkResult = await client.query(`
        SELECT 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
    `);
    
    // Mapear dependencias
    fkResult.rows.forEach(row => {
        if (!dependencies[row.table_name]) {
            dependencies[row.table_name] = [];
        }
        dependencies[row.table_name].push(row.foreign_table_name);
    });
    
    return dependencies;
};

const topologicalSort = (tables, dependencies) => {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (table) => {
        if (visiting.has(table)) {
            throw new Error(`Ciclo detectado en dependencias de tablas: ${table}`);
        }
        if (visited.has(table)) {
            return;
        }
        
        visiting.add(table);
        
        const deps = dependencies[table] || [];
        deps.forEach(dep => {
            if (tables.includes(dep)) {
                visit(dep);
            }
        });
        
        visiting.delete(table);
        visited.add(table);
        sorted.push(table);
    };
    
    tables.forEach(table => visit(table));
    return sorted;
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
        
        // Agregar comandos para deshabilitar foreign keys
        sqlContent += "-- Deshabilitar foreign keys para evitar problemas de dependencias\n";
        sqlContent += "SET session_replication_role = replica;\n\n";
        
        for (const table of tables) {
            console.log(`📝 Procesando tabla: ${table}`);
            
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
                
                sqlContent += `DROP TABLE IF EXISTS "${table}" CASCADE;\n`;
                sqlContent += `CREATE TABLE "${table}" (\n  ${columns.join(',\n  ')}\n);\n\n`;
                
                const dataResult = await client.query(`SELECT * FROM "${table}"`);
                
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
                        sqlContent += `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
                    }
                }
                
                sqlContent += "\n";
            }
        }
        
        // Reactivar foreign keys al final
        sqlContent += "-- Reactivar foreign keys\n";
        sqlContent += "SET session_replication_role = DEFAULT;\n\n";
        
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

const logBackupActivity = async (userId, action, details, ip) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entityType: 'DATABASE',
                details,
                ipAddress: ip
            }
        });
        console.log(`📝 Auditoría registrada: ${action} por usuario ${userId}`);
    } catch (error) {
        console.error('❌ Error registrando auditoría de backup:', error);
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

        await logBackupActivity(req.user.id, 'BACKUP_DOWNLOAD', {
            fileName,
            fileSize: fs.statSync(filePath).size,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        }, req.ip);

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
        return res.status(500).json({ error: "Error interno del servidor", code: 'BACKUP_ERROR' });
    }
};

const validateSqlContent = (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        const dangerousPatterns = [
            { pattern: /DROP\s+DATABASE/i, name: "DROP DATABASE" },
            { pattern: /CREATE\s+USER/i, name: "CREATE USER" },
            { pattern: /ALTER\s+USER/i, name: "ALTER USER" },
            { pattern: /GRANT\s+ALL/i, name: "GRANT ALL" },
            { pattern: /REVOKE\s+/i, name: "REVOKE" },
            { pattern: /COPY\s+.*\s+FROM\s+`/i, name: "COPY FROM" },
            { pattern: /;\s*--\s*bypass/i, name: "Comentario bypass" },
            { pattern: /EXEC\s*\(/i, name: "EXEC" },
            { pattern: /xp_cmdshell/i, name: "xp_cmdshell" }
        ];
        
        for (const { pattern, name } of dangerousPatterns) {
            if (pattern.test(content)) {
                console.error(`⚠️ Patrón peligroso detectado: ${name}`);
                return { 
                    valid: false, 
                    reason: `El archivo contiene comandos peligrosos: ${name}. Por seguridad, este tipo de comandos no están permitidos.` 
                };
            }
        }
        
        const hasValidSql = /(INSERT\s+INTO|CREATE\s+TABLE|SET\s+session_replication_role)/i.test(content);
        if (!hasValidSql) {
            return { 
                valid: false, 
                reason: "El archivo no parece contener SQL válido de backup. Debe incluir sentencias INSERT, CREATE TABLE o configuración de sesión."
            };
        }
        
        console.log("✅ Validación de contenido SQL completada");
        return { valid: true };
    } catch (error) {
        console.error("❌ Error validando contenido SQL:", error);
        return { 
            valid: false, 
            reason: "No se pudo leer o validar el archivo SQL."
        };
    }
};

const verifyRestoreIntegrity = async (client) => {
    const requiredTables = [
        'User', 'UserProfile', 'Cell', 'Convention', 
        'Encuentro', 'Role', 'UserRole'
    ];
    
    const missingTables = [];
    const emptyTables = [];
    
    console.log("🔍 Verificando integridad del restore...");
    
    for (const table of requiredTables) {
        const existsResult = await client.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = $1 AND table_schema = 'public'
            )`,
            [table]
        );
        
        if (!existsResult.rows[0].exists) {
            missingTables.push(table);
            console.error(`❌ Tabla crítica faltante: ${table}`);
            continue;
        }
        
        const countResult = await client.query(
            `SELECT COUNT(*) as count FROM "${table}"` 
        );
        
        const count = parseInt(countResult.rows[0].count);
        if (count === 0 && table !== 'Role') {
            emptyTables.push(table);
            console.warn(`⚠️ Tabla crítica vacía: ${table}`);
        }
        
        console.log(`✅ Tabla ${table}: ${count} registros`);
    }
    
    const isValid = missingTables.length === 0;
    
    return {
        valid: isValid,
        missingTables,
        emptyTables,
        message: isValid 
            ? 'Restore verificado correctamente' 
            : `Faltan tablas críticas: ${missingTables.join(', ')}` 
    };
};

const restoreBackup = async (req, res) => {
    let tempFilePath = null;
    
    try {
        const DATABASE_URL = process.env.PG_DUMP_URL || process.env.DATABASE_URL;

        if (!DATABASE_URL) {
            return res.status(500).json({ error: "DATABASE_URL no está definida" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Debes proporcionar un archivo de backup" });
        }
        
        tempFilePath = req.file.path;

        const fileName = req.file.originalname;
        
        console.log(`📂 Archivo recibido: ${fileName} (${req.file.size} bytes)`);
        
        if (!fileName.toLowerCase().endsWith('.sql')) {
            fs.unlinkSync(tempFilePath);
            return res.status(400).json({ 
                error: "Formato no válido",
                details: "Solo se aceptan archivos .sql. Por favor descarga un backup en formato SQL e intenta nuevamente."
            });
        }

        const maxSize = 100 * 1024 * 1024;
        if (req.file.size > maxSize) {
            fs.unlinkSync(tempFilePath);
            return res.status(400).json({ 
                error: "Archivo demasiado grande",
                details: `Máximo permitido: 100MB. Tu archivo: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`
            });
        }

        // Validar contenido del archivo SQL
        const validationResult = validateSqlContent(tempFilePath);
        if (!validationResult.valid) {
            fs.unlinkSync(tempFilePath);
            return res.status(400).json({ 
                error: "Archivo SQL inválido",
                details: validationResult.reason
            });
        }

        console.log("🔄 Iniciando restauración...");
        
        const result = await executeSqlFileWithTransaction(DATABASE_URL, tempFilePath, res);

        // Verificación post-restore
        const client = new Client({
            connectionString: DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        try {
            await client.connect();
            const verification = await verifyRestoreIntegrity(client);
            
            if (!verification.valid) {
                throw new Error(`Restore incompleto: ${verification.message}`);
            }
            
            console.log("✅ Verificación de integridad completada");
        } finally {
            await client.end();
        }

        fs.unlinkSync(tempFilePath);
        console.log("🗑️ Archivo temporal eliminado");

        await logBackupActivity(req.user.id, 'BACKUP_RESTORE', {
            fileName,
            fileSize: req.file.size,
            statementsExecuted: result.executed,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            success: true
        }, req.ip);

        return res.status(200).json({ 
            message: "Base de datos restaurada exitosamente",
            statementsExecuted: result.executed
        });

    } catch (error) {
        // Log completo solo en servidor (nunca al cliente)
        console.error("❌ Error en restoreBackup:", error);
        console.error("Stack trace:", error.stack);
        
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
                console.log("🗑️ Archivo temporal eliminado en cleanup");
            } catch (e) {
                console.error("❌ Error limpiando archivo temporal:", e);
            }
        }

        // Determinar si es un error que podemos mostrar
        let userMessage = "Error al restaurar la base de datos. Por favor verifica que el archivo sea válido.";
        let errorCode = "RESTORE_ERROR";
        
        // Errores conocidos con mensajes amigables
        if (error.code === 'ECONNREFUSED') {
            userMessage = "No se pudo conectar a la base de datos. Verifica la configuración del servidor.";
            errorCode = "DB_CONNECTION_ERROR";
        } else if (error.code === '28P01') {
            userMessage = "Error de autenticación con la base de datos.";
            errorCode = "DB_AUTH_ERROR";
        } else if (error.code === '42P01') {
            userMessage = "Error en la estructura del archivo SQL.";
            errorCode = "SQL_STRUCTURE_ERROR";
        } else if (error.message.includes('permission denied')) {
            userMessage = "Error de permisos. Verifica que el usuario de base de datos tenga los privilegios necesarios.";
            errorCode = "PERMISSION_ERROR";
        } else if (error.message.includes('syntax error')) {
            userMessage = "Error de sintaxis en el archivo SQL. El archivo puede estar corrupto o ser incompatible.";
            errorCode = "SQL_SYNTAX_ERROR";
        }

        await logBackupActivity(req.user.id, 'BACKUP_RESTORE', {
            fileName: req.file?.originalname || 'unknown',
            fileSize: req.file?.size || 0,
            error: error.message,
            ip: req.ip,
            success: false
        }, req.ip);

        return res.status(500).json({ 
            error: userMessage,
            code: errorCode
        });
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
                console.log("🗑️ Archivo temporal eliminado en cleanup");
            } catch (e) {
                console.error("❌ Error limpiando archivo temporal:", e);
            }
        }
    }
};

module.exports = {
    downloadBackup,
    restoreBackup
};
