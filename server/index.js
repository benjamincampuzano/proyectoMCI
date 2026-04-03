const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const compression = require("compression");
const { randomInt } = require('crypto');

// Global log suppression
if (process.env.NODE_ENV === 'production' || process.env.DISABLE_LOGS === 'true') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  // Keep console.error for critical failures
}

dotenv.config();

const app = express();

/* ✅ Middleware base */
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(compression());

/* ✅ CORS dinámico */

const allowedOrigins = [
  "http://localhost:5173",
  "https://proyecto-mci.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean).map(url => url.replace(/\/$/, ''));
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como apps móviles o curl)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, '');
      const isAllowed = allowedOrigins.includes(cleanOrigin);
      const isVercel = cleanOrigin.endsWith('.vercel.app');

      if (isAllowed || isVercel || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        callback(new Error(msg));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition"]
  })
);

/* ✅ JSON parser */
app.use(express.json());

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
const coordinatorRoutes = require("./routes/coordinatorRoutes");
const artSchoolRoutes = require("./routes/artSchoolRoutes");

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

/* ✅ Healthcheck */
app.get("/", (req, res) => {
  res.json({
    message: "API esta corriendo correctamente...",
    status: "Saludable",
    timestamp: new Date().toISOString()
  });
});


/* ✅ Global Error Handler */
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
