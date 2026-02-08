# Deploy Guide: Railway + Vercel

## Backend en Railway

### 1. Preparar el Repositorio
```bash
# Asegúrate de tener todos los cambios
git add .
git commit -m "Ready for Railway + Vercel deployment"
git push
```

### 2. Configurar Railway
1. Ve a [railway.app](https://railway.app)
2. Conecta tu repositorio GitHub
3. Crea nuevo proyecto desde tu repo
4. Railway detectará automáticamente Node.js
5. Añade servicio PostgreSQL

### 3. Variables de Entorno en Railway
```
DATABASE_URL=(Railway la proporciona automáticamente)
JWT_SECRET=tu-clave-segura-aqui
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://tu-vercel-url.vercel.app
```

### 4. Deploy Automático
- Railway hará deploy automáticamente
- URL del backend: `https://tu-proyecto.up.railway.app`

## Frontend en Vercel

### 1. Separar el Frontend (Opción A: Mismo Repo)
Vercel puede detectar automáticamente la carpeta `client/`:
1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio GitHub
3. Vercel detectará que es un proyecto React en la carpeta `client/`
4. Configura las variables de entorno

### 2. Variables de Entorno en Vercel
```
VITE_API_URL=https://tu-proyecto.up.railway.app
```

### 3. Deploy Automático
- Vercel hará deploy automático en cada push
- URL del frontend: `https://tu-proyecto.vercel.app`

## Opción B: Repositorios Separados

Si prefieres separar completamente:

### Backend
1. Crea repo `proyecto-iglesia-backend`
2. Mueve solo la carpeta `server/`
3. Deploy en Railway

### Frontend  
1. Crea repo `proyecto-iglesia-frontend`
2. Mueve solo la carpeta `client/`
3. Deploy en Vercel

## Pasos Finales

1. **Obtener URLs:**
   - Backend URL: Railway dashboard
   - Frontend URL: Vercel dashboard

2. **Configurar CORS:**
   - Actualiza `FRONTEND_URL` en Railway con la URL de Vercel

3. **Probar:**
   - Visita tu frontend en Vercel
   - Prueba login, registro, etc.

## URLs de Ejemplo
- Backend: `https://proyectoiglesia-production.up.railway.app`
- Frontend: `https://proyecto-iglesia.vercel.app`

## Comandos Útiles

```bash
# Railway logs
railway logs

# Vercel logs
vercel logs

# Redeploy manual
git push origin main
```
