const { execSync, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { Client } = require('pg');

// Helper para encontrar ejecutables de PostgreSQL en Windows
const findPgExecutable = (exeName) => {
    // 1. Priorizar variable de entorno específica si existe
    const envVar = exeName === 'pg_dump' ? process.env.PG_DUMP_PATH : process.env.PG_RESTORE_PATH;
    if (envVar && fs.existsSync(envVar)) return envVar;

    // 2. Intentar encontrarlo en el PATH
    try {
        const whereCmd = process.platform === 'win32' ? `where ${exeName}` : `which ${exeName}`;
        const output = execSync(whereCmd, { encoding: 'utf8' }).split('\n')[0].trim();
        if (output && fs.existsSync(output)) return output;
    } catch (e) {
        // Ignorar error si no está en el PATH
    }

    // 3. Rutas comunes en Windows
    if (process.platform === 'win32') {
        const versions = ['18', '17', '16', '15', '14', '13'];
        for (const v of versions) {
            const fullPath = `C:\\Program Files\\PostgreSQL\\${v}\\bin\\${exeName}.exe`;
            if (fs.existsSync(fullPath)) return fullPath;
        }
    }

    return exeName; // Retornar solo el nombre si no se encontró ruta completa
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

        // Verificar si estamos en Railway para determinar el formato
        const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
        const useSqlFormat = req.query.format === 'sql' || isRailway;
        
        const fileName = useSqlFormat 
            ? `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`
            : `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;

        const filePath = path.join(backupsDir, fileName);

        if (useSqlFormat) {
            // Generar backup en formato SQL plano (compatible con Railway)
            await generateSqlBackup(DATABASE_URL, filePath);
        } else {
            // Generar backup en formato binario .dump (más eficiente pero requiere pg_restore)
            const pgDumpPath = findPgExecutable('pg_dump');
            execFileSync(pgDumpPath, [DATABASE_URL, "-Fc", "-f", filePath]);
        }

        // Exponer el header Content-Disposition para que el frontend pueda leer el nombre del archivo
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        
        // Enviar el archivo al cliente
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error("Error al enviar el archivo:", err);
                // No podemos enviar otra respuesta si ya se inició la descarga
            }
            
            // Eliminar el archivo después de enviarlo para ahorrar espacio
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("Error al eliminar archivo temporal:", unlinkErr);
            });
        });
    } catch (error) {
        console.error("Error en downloadBackup:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

// Función para generar backup en formato SQL plano (compatible con Railway)
const generateSqlBackup = async (databaseUrl, filePath) => {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        await client.connect();
        console.log("📦 Generando backup en formato SQL plano...");
        
        // Obtener todas las tablas
        const tablesResult = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' AND tablename != 'spatial_ref_sys'
            ORDER BY tablename
        `);
        
        const tables = tablesResult.rows.map(row => row.tablename);
        console.log(`📊 Encontradas ${tables.length} tablas: ${tables.join(', ')}`);
        
        let sqlContent = "-- Backup generado automáticamente\n";
        sqlContent += "-- Fecha: " + new Date().toISOString() + "\n";
        sqlContent += "-- Base de datos: " + databaseUrl.split('/').pop() + "\n\n";
        
        // Para cada tabla, generar DROP, CREATE e INSERTs
        for (const table of tables) {
            console.log(`📝 Procesando tabla: ${table}`);
            
            // Obtener estructura de la tabla
            const createTableResult = await client.query(`
                SELECT 
                    'CREATE TABLE ' || $1 || ' (' || 
                    array_to_string(array_agg(column_name || ' ' || data_type || 
                        CASE 
                            WHEN character_maximum_length IS NOT NULL 
                            THEN '(' || character_maximum_length || ')'
                            ELSE ''
                        END
                    ), ', ') || ');' AS create_statement
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
            `, [table]);
            
            if (createTableResult.rows.length > 0) {
                sqlContent += `-- Tabla: ${table}\n`;
                sqlContent += `DROP TABLE IF EXISTS ${table} CASCADE;\n`;
                sqlContent += createTableResult.rows[0].create_statement + "\n\n";
                
                // Obtener todos los datos de la tabla
                const dataResult = await client.query(`SELECT * FROM ${table}`);
                
                if (dataResult.rows.length > 0) {
                    const columns = Object.keys(dataResult.rows[0]);
                    const columnNames = columns.join(', ');
                    
                    for (const row of dataResult.rows) {
                        const values = columns.map(col => {
                            const val = row[col];
                            if (val === null) return 'NULL';
                            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                            if (val instanceof Date) return `'${val.toISOString()}'`;
                            return val.toString();
                        });
                        
                        sqlContent += `INSERT INTO ${table} (${columnNames}) VALUES (${values.join(', ')});\n`;
                    }
                }
                
                sqlContent += "\n";
            }
        }
        
        // Escribir el archivo SQL
        fs.writeFileSync(filePath, sqlContent, 'utf8');
        console.log(`✅ Backup SQL generado: ${filePath}`);
        
    } catch (error) {
        console.error("❌ Error generando backup SQL:", error);
        throw error;
    } finally {
        await client.end();
    }
};

const restoreBackup = async (req, res) => {
    try {
        const DATABASE_URL = process.env.PG_DUMP_URL || process.env.DATABASE_URL;

        if (!DATABASE_URL) {
            return res.status(500).json({ error: "DATABASE_URL no está definida" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Debes proporcionar un archivo de backup" });
        }

        const filePath = req.file.path;
        
        // Verificar si estamos en Railway u otro entorno sin pg_restore
        const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
        
        if (isRailway) {
            // En Railway, usar cliente Node.js PostgreSQL para restaurar
            return await restoreWithNodeClient(DATABASE_URL, filePath, res);
        }

        const pgRestorePath = findPgExecutable('pg_restore');

        try {
            // execFileSync evita problemas de la shell con símbolos y espacios
            execFileSync(pgRestorePath, [
                "--clean",
                "--if-exists",
                "--no-owner",
                "--dbname=" + DATABASE_URL,
                filePath
            ]);

            // Eliminar el archivo temporal
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("Error al eliminar archivo temporal:", unlinkErr);
            });

            return res.status(200).json({ message: "Base de datos restaurada exitosamente" });
        } catch (execError) {
            console.error("❌ Error al ejecutar pg_restore:");
            console.error("Mensaje de error:", execError.message);

            if (execError.stderr) {
                console.error("Stderr detallado:", execError.stderr.toString());
            }

            if (execError.stdout) {
                console.error("Stdout:", execError.stdout.toString());
            }

            // Verificar si el ejecutable existe
            console.error("Ruta de pg_restore utilizada:", pgRestorePath);
            console.error("¿pg_restore existe?", fs.existsSync(pgRestorePath));

            return res.status(500).json({
                error: "Error al restaurar la base de datos.",
                details: execError.stderr ? execError.stderr.toString() : execError.message,
                pgRestorePath: pgRestorePath,
                fileExists: fs.existsSync(filePath)
            });
        }
    } catch (error) {
        console.error("Error en restoreBackup:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

// Función alternativa para restaurar usando cliente Node.js PostgreSQL (para Railway)
const restoreWithNodeClient = async (databaseUrl, filePath, res) => {
    try {
        console.log("🔄 Iniciando restauración con cliente Node.js PostgreSQL...");
        
        // Leer el archivo de backup
        const backupData = fs.readFileSync(filePath);
        console.log(`📁 Archivo de backup leído: ${backupData.length} bytes`);
        
        // Para archivos .dump (formato personalizado), necesitamos una solución diferente
        // ya que no se pueden restaurar directamente con SQL plano
        
        // Opción 1: Intentar restaurar como SQL plano (si el backup fue hecho con --inserts)
        try {
            const sqlContent = backupData.toString('utf8');
            
            // Verificar si parece SQL plano
            if (sqlContent.includes('INSERT INTO') || sqlContent.includes('CREATE TABLE')) {
                console.log("📝 Detectado formato SQL plano, procediendo con restauración...");
                
                const client = new Client({
                    connectionString: databaseUrl,
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
                });
                
                await client.connect();
                
                // Dividir el contenido en sentencias SQL
                const statements = sqlContent
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt && !stmt.startsWith('--'));
                
                console.log(`📊 Ejecutando ${statements.length} sentencias SQL...`);
                
                for (let i = 0; i < statements.length; i++) {
                    const statement = statements[i];
                    if (statement) {
                        try {
                            await client.query(statement);
                            if ((i + 1) % 10 === 0) {
                                console.log(`✅ Progreso: ${i + 1}/${statements.length} sentencias ejecutadas`);
                            }
                        } catch (stmtError) {
                            console.warn(`⚠️ Error en sentencia ${i + 1}: ${stmtError.message}`);
                            // Continuar con las siguientes sentencias
                        }
                    }
                }
                
                await client.end();
                console.log("✅ Restauración completada exitosamente");
                
                // Eliminar archivo temporal
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error("Error al eliminar archivo temporal:", unlinkErr);
                });
                
                return res.status(200).json({ 
                    message: "Base de datos restaurada exitosamente usando cliente Node.js",
                    method: "nodejs-client"
                });
            }
        } catch (sqlError) {
            console.warn("⚠️ No se pudo procesar como SQL plano:", sqlError.message);
        }
        
        // Si llegamos aquí, el archivo está en formato binario .dump
        // Necesitamos informar al usuario que este formato no es compatible con Railway
        console.error("❌ Formato de backup no compatible con Railway");
        
        return res.status(400).json({ 
            error: "Formato de backup no compatible",
            details: "El archivo .dump (formato personalizado de PostgreSQL) no se puede restaurar en Railway sin pg_restore. Por favor, genere un backup en formato SQL plano usando: pg_dump --inserts --no-owner --no-privileges",
            suggestion: "Use: pg_dump --inserts --no-owner --no-privileges DATABASE_URL > backup.sql"
        });
        
    } catch (error) {
        console.error("❌ Error en restoreWithNodeClient:", error);
        
        // Eliminar archivo temporal
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error("Error al eliminar archivo temporal:", unlinkErr);
        });
        
        return res.status(500).json({ 
            error: "Error al restaurar la base de datos con cliente Node.js", 
            details: error.message 
        });
    }
};


module.exports = {
    downloadBackup,
    restoreBackup
};
