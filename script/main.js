var headerLineOffset = 3;

var status = {
  OK: 200,
  UNAUTHORIZED: 401,
  INTERNAL_ERROR: 500,
};

function getSheetContent(sheet)
{
  var range   = 'C' + headerLineOffset + ':F' + sheet.getLastRow();
  var values  = sheet.getRange(range).getValues();
  var records = [];

  for (var i = 0; i < values.length; i++)
  {
    var row = values[i];

    var expBuy  = parseFloat(row[2]);
    var expSell = parseFloat(row[3]);

    records.push({
      row: i,
      ticker:   row[0],
      isBought: row[1] == 'Y',
      expBuy:   isNaN(expBuy)  ? null : expBuy,
      expSell:  isNaN(expSell) ? null : expSell,
    });
  }

  return records;
}

function response(s, data)
{
  var res = { status: s };
  if (typeof data != 'undefined') {
    res.data = data;
  }

  return ContentService
    .createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e)
{
  var accessToken = PropertiesService
    .getScriptProperties()
    .getProperty('ACCESS_TOKEN');

  if (e.parameter.accessToken != accessToken) {
    return response(status.UNAUTHORIZED);
  }

  var sheet = SpreadsheetApp.getActiveSheet();
  var data  = getSheetContent(sheet);

  return response(status.OK, data);
}
