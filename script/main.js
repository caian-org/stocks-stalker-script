var headerLineOffset = 3;

var status = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INTERNAL_ERROR: 500,
};

var sheet = SpreadsheetApp.getActiveSheet();

function isAuthorized(e)
{
  var accessToken = PropertiesService
    .getScriptProperties()
    .getProperty('ACCESS_TOKEN');

  return e.parameter.accessToken == accessToken;
}

function cleanAll(sheet)
{
  var last = sheet.getLastRow();
  var r = 'C' + headerLineOffset + ':H' + last;

  var v = [];
  for (var i = 0; i <= (last - headerLineOffset); i++)
    v.push(['', '', '', '', '', '']);

  sheet.getRange(r).setValues(v);
}

function updateSheetContent(sheet, data)
{
  var tickers = data.tickers;

  for (var i = 0; i < tickers.length; i++) {
    var ticker = tickers[i];

    var row = ticker.row + headerLineOffset;
    var range = 'C' + row + ':H' + row;

    var info = [
      ticker.code,
      (ticker.isBought ? 'Y' : 'N'),
      ticker.expBuy,
      ticker.expSell,
      ticker.value,
      ticker.update];

    sheet.getRange(range).setValues([info]);
  }
}

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
      code:     row[0],
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

function err(err, data)
{
  return { error: err, got: data };
}

function doGet(e)
{
  if (!isAuthorized(e))
    return response(status.UNAUTHORIZED);

  try {
    return response(status.OK, getSheetContent(sheet));
  }
  catch (ex) {
    return response(status.INTERNAL_ERROR, err(ex, e));
  }
}

function doPost(e)
{
  if (!isAuthorized(e))
    return response(status.UNAUTHORIZED);

  if (typeof e.postData == 'undefined')
    return response(status.BAD_REQUEST);

  try {
    cleanAll(sheet);
    updateSheetContent(sheet, JSON.parse(e.postData.contents));

    return response(status.OK);
  }
  catch (ex) {
    return response(status.INTERNAL_ERROR, err(ex, e));
  }
}
