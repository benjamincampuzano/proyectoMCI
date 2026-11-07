const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const fs = require("fs");
const { randomInt } = require('crypto');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const { csrfProtection, verifyOrigin } = require('./middleware/csrf');
const { getAllowedOrigins, isAllowedOrigin } = require('./utils/origins');

// Trigger restart after fixing Prisma client

// Global log suppression
if (process.env.NODE_ENV === 'production' || process.env.DISABLE_LOGS === 'true') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  // Keep console.error for critical failures
}

dotenv.config();

const app = express();

/* ✅ Trust proxy for rate limiting behind reverse proxy */
app.set('trust proxy', ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);

/* ✅ Middlewaree */
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://proyecto-mci.vercel.app"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.use(compression());

/* ✅ CORS dinámico */

// Lista única de orígenes permitidos (compartida con el middleware CSRF).
const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como apps móviles o curl)
      if (!origin) return callback(null, true);

      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        callback(new Error(msg));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // Imprescindible para que el navegador envíe la cookie del refresh token.
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Restore-Password", "X-CSRF-Token"],
    exposedHeaders: ["Content-Disposition"]
  })
);

/* ✅ JSON parser */
app.use(express.json());
// ✅ Límite reducido a 5mb (el original de 100mb permitía picos de heap enormes)
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

/* ✅ Protección CSRF
 * - Exige token CSRF (double submit firmado) en las peticiones que modifican
 *   estado y arrastran la cookie de sesión.
 * - Verifica el header Origin en las peticiones que modifican estado.
 * El access token viaja en la cabecera Authorization, por lo que el resto de
 * la API no es vulnerable a CSRF por construcción.
 */
app.use(csrfProtection);
app.use(verifyOrigin);

/* ✅ Rate Limiting */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por ventana
  message: { message: 'Demasiados intentos de login. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 refresh por ventana (por usuario)
  message: { message: 'Demasiadas solicitudes de token. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ✅ Request logger (commented out to reduce console noise) */
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

/* ✅ Routes */
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const guestRoutes = require("./routes/guestRoutes");
const networkRoutes = require("./routes/networkRoutes");
const consolidarRoutes = require("./routes/consolidarRoutes");
const seminarRoutes = require("./routes/seminarRoutes");
const enviarRoutes = require("./routes/enviarRoutes");
const conventionRoutes = require("./routes/conventionRoutes");
const encuentroRoutes = require("./routes/encuentroRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const auditRoutes = require("./routes/auditRoutes");
const goalRoutes = require("./routes/goalRoutes");
const oracionDeTresRoutes = require("./routes/oracionDeTresRoutes");
const legalDocumentRoutes = require("./routes/legalDocumentRoutes");
const kidsRoutes = require("./routes/kidsRoutes");
const kidsScheduleRoutes = require("./routes/kidsSchedule");
const kidsClassPhotosRoutes = require("./routes/kidsClassPhotos");
const coordinatorRoutes = require('./routes/coordinatorRoutes');
const artSchoolRoutes = require('./routes/artSchoolRoutes');
const servidorRoutes = require('./routes/servidorRoutes');
const publicRoutes = require('./routes/publicRoutes');
const dashboardTasksRoutes = require('./routes/dashboardTasksRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const bulkImportRoutes = require('./routes/bulkImportRoutes');
const loginSettingRoutes = require('./routes/loginSettingRoutes');

/* ✅ Proteger directorios sensibles */
app.use('/backups', (req, res) => {
    res.status(403).json({ 
        error: 'Acceso prohibido',
        message: 'Este directorio no es accesible vía web'
    });
});

app.use('/uploads', (req, res, next) => {
    // Permitir solo si es procesamiento interno de multer
    const isInternalMulter = req.method === 'POST' && 
                              req.originalUrl.includes('/api/audit/restore');
    if (!isInternalMulter) {
        return res.status(403).json({ error: 'Acceso prohibido' });
    }
    next();
});

/* ✅ Servir medios de bienvenida del login (imágenes/videos) */
const loginMediaDir = path.join(process.cwd(), 'uploads', 'login-media');
fs.mkdirSync(loginMediaDir, { recursive: true });
app.use('/media', express.static(loginMediaDir, { maxAge: '1d' }));

/* ✅ API endpoints */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/consolidar", consolidarRoutes);
app.use("/api/seminar", seminarRoutes);
app.use("/api/enviar", enviarRoutes);
app.use("/api/convenciones", conventionRoutes);
app.use("/api/encuentros", encuentroRoutes);
app.use("/api/school", schoolRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/metas", goalRoutes);
app.use("/api/oracion-de-tres", oracionDeTresRoutes);
app.use("/api/legal-documents", legalDocumentRoutes);
app.use("/api/kids", kidsRoutes);
app.use("/api/kids-schedule", kidsScheduleRoutes);
app.use("/api/kids-class-photos", kidsClassPhotosRoutes);
app.use("/api/coordinators", coordinatorRoutes);
app.use("/api/arts", artSchoolRoutes);
app.use("/api/servidores", servidorRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/dashboard-tasks", dashboardTasksRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/users", bulkImportRoutes);
app.use("/api/login-setting", loginSettingRoutes);

/* ✅ Healthcheck */
app.get("/", (req, res) => {
  res.json({
    message: "API esta corriendo correctamente...",
    status: "Saludable",
    timestamp: new Date().toISOString()
  });
});

/* Scheduled Tasks */
const { cleanupExpiredTokens } = require('./scripts/cleanupExpiredTokens');
const { cleanupOrphanedTokens } = require('./scripts/cleanupOrphanedTokens');
const { cleanupOldAuditLogs } = require('./scripts/cleanupOldAuditLogs');

// Limpieza de refresh tokens expirados — cada hora
cron.schedule('0 * * * *', async () => {
  try {
    const expiredCount = await cleanupExpiredTokens();
    const orphanedCount = await cleanupOrphanedTokens();
    if (process.env.NODE_ENV !== "production") {
      console.log(`🧹 Token cleanup: ${expiredCount} expirados + ${orphanedCount} huérfanos eliminados`);
    }
  } catch (error) {
    console.error('Token cleanup failed:', error);
  }
});

// ✅ Limpieza de AuditLog — diariamente a las 2 AM (previene que la tabla crezca sin control)
cron.schedule('0 2 * * *', async () => {
  try {
    const deleted = await cleanupOldAuditLogs();
    if (process.env.NODE_ENV !== "production" && deleted > 0) {
      console.log(`🧹 AuditLog cleanup: ${deleted} registros viejos eliminados`);
    }
  } catch (error) {
    console.error('AuditLog cleanup failed:', error);
  }
});

/* Global Error Handler */
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ Global Error Handler:", err.stack);
  }
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "production" ? {} : err.message,
  });
});

/* ✅ Start server */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`Server running on port ${PORT}`);
  }
});
