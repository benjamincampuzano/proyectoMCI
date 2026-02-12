const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const compression = require("compression");

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
  process.env.FRONTEND_URL
].filter(Boolean).map(url => url.replace(/\/$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como apps móviles o curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* ✅ JSON parser */
app.use(express.json());

/* ✅ Request logger */
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

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

/* ✅ Healthcheck */
app.get("/", (req, res) => {
  res.json({
    message: "API is running...",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

/* ✅ Start server (SOLO UNA VEZ) */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
