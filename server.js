const express = require("express");
const ExcelJS = require("exceljs");

const app = express();
app.use(express.json({ limit: "10mb" }));

// Protección simple: Bubble debe mandar este header con la misma clave
const API_KEY = process.env.API_KEY || "cambia-esta-clave";

app.post("/generar-excel", async (req, res) => {
  try {
    const clave = req.header("x-api-key");
    if (clave !== API_KEY) {
      return res.status(401).json({ error: "No autorizado" });
    }

    // Bubble puede mandar el array directo, o como { discrepancies: [...] }
    const body = req.body;
    const discrepancias = body.discrepancias || body.discrepancies || (Array.isArray(body) ? body : []);

    if (!Array.isArray(discrepancias)) {
      return res.status(400).json({ error: "Se esperaba un array de discrepancias" });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Pacioli - Conciliación RG90";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Conciliación", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Tipo de Diferencia", key: "tipo", width: 26 },
      { header: "RUC", key: "ruc", width: 16 },
      { header: "N° Comprobante", key: "comprobante", width: 20 },
      { header: "Monto Libro Interno", key: "monto_interno", width: 20 },
      { header: "Monto RG90", key: "monto_rg90", width: 20 },
      { header: "Diferencia", key: "diferencia", width: 18 },
      { header: "Descripción", key: "descripcion", width: 45 },
    ];

    // Estilo del encabezado: navy + gold, acorde a Pacioli
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFD4AF37" } }; // gold
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B2A4A" }, // navy
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFD4AF37" } } };
    });
    headerRow.height = 22;

    discrepancias.forEach((d) => {
      const row = sheet.addRow({
        tipo: d.tipo || "",
        ruc: d.ruc || "",
        comprobante: d.comprobante || "",
        monto_interno: Number(d.monto_interno) || 0,
        monto_rg90: Number(d.monto_rg90) || 0,
        diferencia: Number(d.diferencia) || 0,
        descripcion: d.descripcion || "",
      });

      ["monto_interno", "monto_rg90", "diferencia"].forEach((key) => {
        row.getCell(key).numFmt = '#,##0 "Gs."';
      });

      // Resaltar en rojo suave las filas con diferencia de monto
      if (d.tipo === "Monto_Incorrecto") {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDEBEC" } };
        });
      }
    });

    sheet.autoFilter = { from: "A1", to: "G1" };

    // Fila resumen al final
    sheet.addRow([]);
    const totalDif = discrepancias.reduce((acc, d) => acc + (Number(d.diferencia) || 0), 0);
    const resumen = sheet.addRow(["Total de discrepancias:", discrepancias.length]);
    resumen.font = { bold: true };
    const resumen2 = sheet.addRow(["Suma total de diferencias (Gs.):", totalDif]);
    resumen2.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Conciliacion_RG90_${Date.now()}.xlsx"`
    );
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generando el Excel", detalle: err.message });
  }
});

app.get("/", (req, res) => res.send("Servicio de conciliación Pacioli activo ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servicio corriendo en puerto ${PORT}`));
