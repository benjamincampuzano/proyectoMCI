const { execSync } = require('child_process');

try {
    const cmd = `"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe" "postgresql://postgres:SNCaHyDPfUIgmfBJwKXvUyelZgqYOgMx@gondola.proxy.rlwy.net:58022/railway" -Fc -f "test_backup.dump"`;
    console.log("Running:", cmd);
    execSync(cmd, { stdio: 'pipe' });
    console.log("Success");
} catch (e) {
    console.error("Error message:", e.message);
    if (e.stdout) console.error("Stdout:", e.stdout.toString());
    if (e.stderr) console.error("Stderr:", e.stderr.toString());
}
