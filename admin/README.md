# 🔒 Panel de Administración Separado - TCorp

Este es un panel de administración completamente independiente del sitio web principal, diseñado con seguridad empresarial en mente.

## 🛡️ Características de Seguridad

### Aislamiento Total
- **Servidor Separado**: Corre en un puerto diferente (default: 3001) del sitio público (5000)
- **Proceso Independiente**: Puede ejecutarse en una máquina/VPS diferente
- **Base de código aislada**: Frontend y backend completamente separados

### Restricciones de Red
- **Solo Localhost por Defecto**: `ADMIN_HOST=127.0.0.1`
- **Puerto No Público**: El puerto 3001 no debe estar expuesto al internet
- **IP Whitelist**: Sistema de lista blanca de IPs para acceso autorizado

### Autenticación Robusta
- **Slugs Efímeros**: URLs de acceso que rotan cada 24 horas
- **Credenciales Derivadas**: Usuario y contraseña generados desde el slug (no almacenados)
- **2FA Opcional**: Autenticación de dos factores con apps como Google Authenticator
- **Sesiones Independientes**: Sistema de sesiones separado del sitio principal

### Anti-Fuerza Bruta
- **Límite de Intentos**: Máximo 3 intentos de login fallidos
- **Ban Automático**: IPs bannedas por 24 horas tras exceder intentos
- **Logs Completos**: Registro de todos los intentos de autenticación

## 📋 Requisitos

- Node.js 18+
- PostgreSQL o Neon Database
- Acceso SSH o VPN para acceso remoto (producción)

## 🚀 Instalación

### 1. Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# Panel Admin - Puerto y Host
ADMIN_PORT=3001
ADMIN_HOST=127.0.0.1

# Seguridad Admin
ADMIN_SESSION_SECRET=tu-clave-secreta-muy-larga-y-aleatoria
ADMIN_2FA_ISSUER=TCorp Admin Panel

# Email para notificaciones de slug
ADMIN_EMAIL=admin@tudominio.com
```

### 2. Instalación de Dependencias

Las dependencias ya están incluidas en el `package.json` principal:

```bash
npm install
```

### 3. Configuración Inicial

El slug inicial se genera automáticamente al iniciar el servidor:

```bash
npm run admin:dev
```

Verás en consola:

```
================================================================================
[Admin Setup] EPHEMERAL ADMIN ACCESS URL GENERATED
================================================================================
URL: /secure/AbC123...XyZ789
Expires: 2024-12-27T04:30:00.000Z
================================================================================
IMPORTANT: Save this URL. It will NOT be shown again.
================================================================================
```

## 🖥️ Uso

### Modo Desarrollo

```bash
# Windows
npm run admin:dev

# Linux/Mac
npm run admin:dev:unix
```

Accede a: `http://127.0.0.1:3001/secure/[TU-SLUG]`

### Modo Producción

```bash
# 1. Build del cliente y servidor
npm run admin:build

# 2. Iniciar servidor de producción
# Windows
npm run admin:start

# Linux/Mac
npm run admin:start:unix
```

## 🔐 Acceso Remoto Seguro

### ⚠️ NUNCA expongas el puerto 3001 directamente al internet

### Opción 1: SSH Tunnel (Recomendado)

```bash
# Desde tu máquina local
ssh -L 3001:127.0.0.1:3001 usuario@tu-servidor.com

# Luego accede a: http://localhost:3001/secure/[SLUG]
```

### Opción 2: VPN

1. Configura una VPN (WireGuard, OpenVPN, etc.)
2. Conecta a la VPN
3. Accede a la IP privada del servidor en el puerto 3001

### Opción 3: IP Whitelist

Si necesitas acceso directo:

1. Configura firewall para bloquear el puerto 3001 excepto IPs específicas:

```bash
# UFW (Ubuntu/Debian)
sudo ufw deny 3001
sudo ufw allow from TU.IP.PUBLICA.AQUI to any port 3001

# iptables
sudo iptables -A INPUT -p tcp --dport 3001 -s TU.IP.PUBLICA.AQUI -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3001 -j DROP
```

2. Agrega tu IP en el panel admin (Seguridad > IP Whitelist)

## 📁 Estructura de Archivos

```
admin/
├── server/
│   ├── index.ts           # Servidor Express principal
│   ├── routes.ts          # Todas las rutas admin
│   ├── middleware.ts      # Seguridad y autenticación
│   └── vite.ts           # Integración Vite (dev mode)
│
├── client/
│   ├── src/
│   │   ├── pages/        # Páginas del panel
│   │   ├── components/   # Componentes React
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilidades
│   │   ├── App.tsx       # Aplicación principal
│   │   └── main.tsx      # Entry point
│   ├── index.html
│   └── vite.config.ts
│
├── dist/                 # Build de producción
└── README.md            # Este archivo
```

## 🔧 Funcionalidades del Panel

### Dashboard
- Estadísticas de usuarios e inboxes
- Métricas de uso del sistema
- Vista general en tiempo real

### Gestión de Usuarios
- Ver todos los usuarios registrados
- Eliminar usuarios
- Ver estadísticas de verificación

### Gestión de Inboxes
- Listar todos los inboxes activos
- Ver detalles de cada inbox
- Gestionar expiración

### Dominios
- Agregar/Eliminar dominios de email
- Verificar dominios en blacklist
- Activar/Desactivar dominios

### CyberTemp Integration
- Ver plan actual de CyberTemp
- Generar subdominios automáticamente
- Gestionar emails temporales
- Ver emails recibidos

### Seguridad
- IP Whitelist management
- Ver IPs bloqueadas
- Logs de autenticación
- Rotación manual de slugs
- Configuración 2FA

### Logs del Sistema
- Logs de autenticación
- Acciones administrativas
- Eventos de seguridad
- Filtros y búsqueda

### Configuración
- Rotación de slugs
- 2FA setup
- Preferencias del panel

## 🛠️ Mantenimiento

### Rotación de Slug

El slug rota automáticamente cada 24 horas. Puedes forzar la rotación:

1. Accede a: Configuración > Seguridad
2. Click en "Rotar Slug Ahora"
3. Se enviará un email con el nuevo slug (si `ADMIN_EMAIL` está configurado)

### Backups

El panel usa la misma base de datos que el sitio principal. Asegúrate de:

1. Hacer backups regulares de PostgreSQL
2. Incluir las tablas `admin_*` en los backups
3. Guardar las variables de entorno de forma segura

### Logs

Los logs se almacenan en la tabla `admin_logs`:

```sql
SELECT * FROM admin_logs 
ORDER BY created_at DESC 
LIMIT 100;
```

## 🚨 Troubleshooting

### No puedo acceder al panel

1. Verifica que el servidor esté corriendo: `npm run admin:dev`
2. Verifica el puerto: `ADMIN_PORT` en `.env`
3. Verifica el host: debe ser `127.0.0.1` para localhost
4. Verifica el slug: debe ser el actual (rotado cada 24h)

### Error de autenticación

1. Verifica que estés usando el slug correcto
2. Las credenciales se derivan del slug automáticamente
3. Revisa los logs: `SELECT * FROM admin_logs WHERE success = 'false'`

### IP Bloqueada

Si tu IP fue bloqueada por intentos fallidos:

1. Espera 24 horas (ban automático)
2. O accede a la base de datos y limpia: `DELETE FROM admin_logs WHERE ip = 'TU.IP.AQUI'`

### Base de datos no disponible

El panel puede funcionar en modo "memory-only" si la DB no está disponible:
- Las sesiones funcionarán pero no persistirán
- Los slugs no se guardarán
- Reconecta la DB lo antes posible

## ⚡ Performance

### Optimizaciones Incluidas

- Build optimizado con Vite
- Code splitting automático
- Assets minificados
- Compresión gzip
- React Query para caching

### Recursos del Sistema

- **RAM**: ~50-100 MB
- **CPU**: Mínimo (solo durante requests)
- **Disco**: ~10 MB (build)

## 🔗 Links Útiles

- [Documentación CyberTemp](https://www.cybertemp.xyz/docs)
- [Express.js Docs](https://expressjs.com/)
- [React Query Docs](https://tanstack.com/query/latest)
- [Vite Docs](https://vitejs.dev/)

## ⚠️ Advertencias de Seguridad

1. **NUNCA** expongas el puerto del admin panel directamente al internet
2. **SIEMPRE** usa HTTPS en producción con un reverse proxy (nginx/caddy)
3. **NUNCA** commitees el archivo `.env` al repositorio
4. **SIEMPRE** usa contraseñas fuertes y únicas
5. **NUNCA** compartas los slugs por canales inseguros
6. **SIEMPRE** revisa los logs regularmente
7. **NUNCA** deshabilites el IP whitelist en producción sin VPN/SSH

## 📝 Licencia

Mismo que el proyecto principal (MIT)

---

**Desarrollado con 🔒 para TCorp**
