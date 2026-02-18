const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const findPgExecutable = (exeName) => {
    // 1. Priorizar variable de entorno específica si existe
    const envVar = exeName === 'pg_dump' ? process.env.PG_DUMP_PATH : process.env.PG_RESTORE_PATH;
    if (envVar && fs.existsSync(envVar)) return envVar;

    // 2. Intentar encontrarlo en el PATH
    try {
        const whereCmd = process.platform === 'win32' ? `where ${exeName}` : `which ${exeName}`;
        const outputArr = execSync(whereCmd, { encoding: 'utf8' }).split('\n');
        const output = outputArr[0].trim();
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

const pgDumpPath = findPgExecutable('pg_dump');
console.log(`Detected pg_dump path: ${pgDumpPath}`);

if (fs.existsSync(pgDumpPath) || pgDumpPath === 'pg_dump') {
    try {
        const version = execSync(`"${pgDumpPath}" --version`, { encoding: 'utf8' });
        console.log(`Executable version: ${version.trim()}`);
        console.log("✅ Verification successful: pg_dump found and executable.");
    } catch (e) {
        console.error(`❌ Verification failed: Error executing pg_dump. ${e.message}`);
    }
} else {
    console.error(`❌ Verification failed: pg_dump path does not exist.`);
}
