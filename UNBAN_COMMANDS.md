# Comandos para Desbanear IPs

## Método 1: Desde la Consola (Recomendado)

Usa el script CLI para desbanear una IP por su código único:

```bash
npm run unban <BAN_CODE>
```

**Ejemplo:**
```bash
npm run unban ABC123
```

**Salida esperada:**
```
🔍 Buscando banos con código: ABC123

Found 1 ban(s) in Level 1
  - Removing: 192.168.1.100 (banned until: 2024-12-27T20:05:30.123Z)

✅ Baneo eliminado exitosamente!
📋 IPs desbaneadas: 192.168.1.100
```

---

## Método 2: API HTTP

Envía una petición POST al endpoint de debaneo:

```bash
curl -X POST http://localhost:3000/api/admin/unban \
  -H "Content-Type: application/json" \
  -d '{"banCode":"ABC123"}'
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Baneo eliminado exitosamente. IPs desbaneadas: 192.168.1.100",
  "unbannedIps": ["192.168.1.100"]
}
```

**Respuesta error:**
```json
{
  "success": false,
  "message": "No se encontró ningún baneo con código: ABC123"
}
```

---

## Niveles de Baneo

El sistema escala los banos en 4 niveles:

1. **Level 1**: 5 segundos (primer intento fallido)
2. **Level 2**: 10 segundos (segundo intento fallido)
3. **Level 3**: 20 segundos (tercer intento fallido)
4. **Permanente**: Sin límite de tiempo (cuarto intento fallido)

Cada IP recibe un código único de 6 caracteres (ej: `ABC123`) que se muestra en la página de baneo.

---

## Consultar Banos en la Base de Datos

### Ver todos los banos temporales (Level 1-3):

```sql
SELECT ipAddress, banCode, bannedUntil FROM ip_bans_level1
UNION ALL
SELECT ipAddress, banCode, bannedUntil FROM ip_bans_level2
UNION ALL
SELECT ipAddress, banCode, bannedUntil FROM ip_bans_level3
ORDER BY bannedUntil DESC;
```

### Ver todos los banos permanentes:

```sql
SELECT ipAddress, banCode FROM ip_bans_permanent;
```

### Ver todos los banos (todos los niveles):

```sql
SELECT ipAddress, banCode, bannedUntil, 'Level 1' as level FROM ip_bans_level1
UNION ALL
SELECT ipAddress, banCode, bannedUntil, 'Level 2' as level FROM ip_bans_level2
UNION ALL
SELECT ipAddress, banCode, bannedUntil, 'Level 3' as level FROM ip_bans_level3
UNION ALL
SELECT ipAddress, banCode, NULL, 'Permanente' as level FROM ip_bans_permanent
ORDER BY ipAddress;
```

---

## Troubleshooting

### "No se encontró ningún baneo"
- Verifica que el código está en mayúsculas
- Confirma que el código es exacto (6 caracteres)
- El baneo puede haber expirado automáticamente

### "Error: Cannot find module"
- Asegúrate de estar en la raíz del proyecto
- Ejecuta `npm install` primero

### Tabla no existe
- El script crea automáticamente las tablas si no existen
- Si hay error, ejecuta: `npm run db:push`
