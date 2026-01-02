# ⚡ Quick Start - Panel Admin

## 🚀 Inicio Rápido (5 minutos)

### 1. Verifica las Variables de Entorno

Tu archivo `.env` debe contener:

```env
ADMIN_PORT=3001
ADMIN_HOST=127.0.0.1
ADMIN_SESSION_SECRET=tu-secret-key
ADMIN_EMAIL=tu-email@dominio.com
```

### 2. Inicia el Servidor Admin

**Desarrollo:**
```bash
npm run admin:dev
```

**Producción:**
```bash
npm run admin:build
npm run admin:start
```

### 3. Obtén el Slug de Acceso

Al iniciar el servidor, verás en consola:

```
================================================================================
[Admin Setup] EPHEMERAL ADMIN ACCESS URL GENERATED
================================================================================
URL: /secure/AbC123XyZ789...
Expires: 2024-12-27T04:30:00.000Z
================================================================================
```

### 4. Accede al Panel

Abre tu navegador en:
```
http://127.0.0.1:3001/secure/AbC123XyZ789...
```

### 5. Credenciales de Login

Las credenciales se derivan automáticamente del slug. El servidor te mostrará:

```
Username: admin_AbC123
Password: XyZ789...
```

O verifica en los logs del servidor después del inicio.

---

## 🔧 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run admin:dev` | Inicia servidor en modo desarrollo |
| `npm run admin:dev:unix` | Inicia servidor en Linux/Mac |
| `npm run admin:build` | Build para producción |
| `npm run admin:start` | Inicia en producción (Windows) |
| `npm run admin:start:unix` | Inicia en producción (Linux/Mac) |

---

## 🌐 Acceso Remoto

### Opción 1: SSH Tunnel (Más Seguro)

Desde tu PC local:
```bash
ssh -L 3001:127.0.0.1:3001 usuario@tu-servidor.com
```

Luego accede a: `http://localhost:3001/secure/[SLUG]`

### Opción 2: VPN

1. Conecta a tu VPN
2. Accede a la IP privada del servidor

---

## 📌 Notas Importantes

- ✅ El slug rota cada 24 horas
- ✅ Solo accesible desde localhost por defecto
- ✅ Usa SSH tunnel para acceso remoto
- ❌ NUNCA expongas el puerto 3001 al internet
- ❌ NUNCA compartas el slug por email/chat sin cifrar

---

## 🆘 Problemas Comunes

### No puedo acceder
- Verifica que el servidor esté corriendo
- Verifica el puerto: `netstat -an | findstr :3001`
- Verifica el slug no haya expirado

### Credenciales incorrectas
- Las credenciales cambian cuando el slug rota
- Reinicia el servidor para ver las nuevas credenciales

### Puerto en uso
- Cambia `ADMIN_PORT` en `.env`
- O mata el proceso: `netstat -ano | findstr :3001`

---

**¿Necesitas ayuda?** Lee el [README completo](./README.md)
