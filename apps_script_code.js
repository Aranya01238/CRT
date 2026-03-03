function doPost(e) {
  const sheet = SpreadsheetApp
    .openById("YOUR_SHEET_ID")
    .getSheetByName("Registrations");

  const data = JSON.parse(e.postData.contents);

  const headers = [
    "Name",
    "Email",
    "Project Title",
    "Production Date",
    "Trailer Link",
    "Full Film Link",
    "Cast",
    "Producer",
    "Directors Byte",
    "Created At",
    "Updated At"
  ];

  const toSheetRow = (row) => ([
    row?.name || "",
    row?.email || "",
    row?.projectTitle || "",
    row?.productionDate || "",
    row?.trailerLink || "",
    row?.fullFilmLink || "",
    row?.cast || "",
    row?.producer || "",
    row?.directorsByte || "",
    row?.createdAt || "",
    row?.updatedAt || ""
  ]);

  const findRowByEmail = (email) => {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;

    const emailValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    const target = (email || "").toString().trim().toLowerCase();

    for (let i = 0; i < emailValues.length; i += 1) {
      const current = (emailValues[i][0] || "").toString().trim().toLowerCase();
      if (current === target) return i + 2;
    }

    return -1;
  };

  const type = (data.type || "").toString().toLowerCase();

  if (type === "resync") {
    sheet.clearContents();
    sheet.appendRow(headers);

    const rows = Array.isArray(data.data) ? data.data : [];
    rows.forEach((row) => {
      sheet.appendRow(toSheetRow(row));
    });
  }

  if (type === "upsert") {
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    const row = data.data || {};
    const email = (row.email || "").toString().trim().toLowerCase();
    if (email) {
      const existingRow = findRowByEmail(email);
      if (existingRow > 0) {
        sheet.getRange(existingRow, 1, 1, headers.length).setValues([toSheetRow(row)]);
      } else {
        sheet.appendRow(toSheetRow(row));
      }
    }
  }

  if (type === "delete") {
    const email = (data.email || "").toString().trim().toLowerCase();
    if (email) {
      const rowNumber = findRowByEmail(email);
      if (rowNumber > 0) {
        sheet.deleteRow(rowNumber);
      }
    }
  }

  return ContentService.createTextOutput("Success");
}
