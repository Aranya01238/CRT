function doPost(e) {
  const sheet = SpreadsheetApp
    .openById("YOUR_SHEET_ID")
    .getSheetByName("Registrations");

  const data = JSON.parse(e.postData.contents);
  
  if (data.bulkData) {
    sheet.clearContents();
    
    sheet.appendRow([
      "Name", "Email", "Project Title",
      "Production Date", "Cast",
      "Producer", "Created At"
    ]);

    data.bulkData.forEach(row => {
      sheet.appendRow([
        row.name,
        row.email,
        row.projectTitle,
        row.productionDate,
        row.cast,
        row.producer,
        row.createdAt
      ]);
    });
  }

  return ContentService.createTextOutput("Success");
}
