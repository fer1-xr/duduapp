# Servicio de Excel para Conciliación RG90 (Pacioli)

Este microservicio recibe el array de discrepancias (el JSON que ya devuelve tu "cerbero") y responde con un archivo `.xlsx` real, con formato navy/gold.

## 1. Desplegar (elige uno, ambos tienen capa gratuita)

### Opción A: Railway
1. Creá cuenta en https://railway.app
2. "New Project" → "Deploy from GitHub repo" (subí esta carpeta a un repo) o "Empty Project" y subí los archivos manualmente.
3. En "Variables", agregá `API_KEY` = una clave secreta que vos elijas (ej: `pacioli_2026_xyz`).
4. Railway te da una URL pública, ej: `https://tu-servicio.up.railway.app`

### Opción B: Render
1. Creá cuenta en https://render.com
2. "New Web Service" → conectá el repo o subí el zip.
3. Build command: `npm install` — Start command: `npm start`
4. En "Environment", agregá `API_KEY`.
5. Te da una URL, ej: `https://tu-servicio.onrender.com`

## 2. Probar que funciona

```bash
curl -X POST https://tu-servicio.onrender.com/generar-excel \
  -H "Content-Type: application/json" \
  -H "x-api-key: pacioli_2026_xyz" \
  -d '[{"tipo":"Monto_Incorrecto","ruc":"70033333-3","comprobante":"001-003-0001567","monto_interno":100000,"monto_rg90":60000,"diferencia":40000,"descripcion":"Diferencia de monto"}]' \
  --output prueba.xlsx
```

Si `prueba.xlsx` abre bien en Excel, el servicio está listo.

## 3. Conectar con Bubble (API Connector)

1. Andá a tu app de Bubble → Plugins → **API Connector** → "Add another API".
2. Nombre: `Pacioli Excel Service`
3. Agregá un **Action** (no "Data"):
   - Method: `POST`
   - URL: `https://tu-servicio.onrender.com/generar-excel`
   - Headers:
     - `Content-Type: application/json`
     - `x-api-key: pacioli_2026_xyz`
   - Body type: `JSON`
   - Body: pegá el JSON que devuelve tu Server Script (podés usar un texto de ejemplo real de tu tabla `DiscrepancyResults` para inicializar)
4. Al hacer "Initialize call", Bubble va a detectar que la respuesta **no es JSON sino un archivo binario**. Marcá la casilla **"This is a file"** (Bubble la muestra cuando detecta el `Content-Type` de Excel). Esto hace que la Action devuelva un objeto tipo `file` que podés guardar directo.

## 4. Ajustar tu workflow de Bubble

En el workflow `Button start-reconciliation-btn is clicked`, después del **Step 3 (Make changes to ConciliationSession)**, agregá:

- **Step 4 (nuevo): Pacioli Excel Service - generar-excel**
  - Body: `Result of Step 2 (Server script)` (tu JSON de discrepancias)
- **Step 5: Make changes to ConciliationSession**
  - Campo `archivo_resultado` (tipo file) = `Result of Step 4 (generar-excel)`
- Recién ahí el **Step 6: Go to page nueva-conciliacion**, mandando el `ConciliationSession` ya actualizado con su archivo adjunto.

En la página `nueva-conciliacion`, agregá un botón "Descargar Excel" con acción **"Open an external website"** o simplemente un elemento tipo File Uploader/Link apuntando a `ConciliationSession's archivo_resultado`.

## 5. Seguridad

- Nunca dejes `API_KEY` en blanco en producción — es lo único que evita que cualquiera con la URL genere archivos a tu costa.
- Si vas a manejar datos de clientes reales (RUC, montos), asegurate de que el servicio esté en HTTPS (Railway/Render lo dan por defecto).
