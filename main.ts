enum HttpStatus
{
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  INTERNAL_ERROR = 500,
}

const headerRowOffset = 3
const sheet = SpreadsheetApp.getActiveSheet()

function isAuthorized(e)
{
  const accessToken = PropertiesService
    .getScriptProperties()
    .getProperty('ACCESS_TOKEN')

  return e.parameter.accessToken == accessToken
}

function cleanAll(sheet: GoogleAppsScript.Spreadsheet.Sheet)
{
  const last = sheet.getLastRow()
  const r = 'C' + headerRowOffset + ':H' + last

  const v = []
  for (let i = 0; i <= (last - headerRowOffset); i++)
    v.push(['', '', '', '', '', ''])

  sheet.getRange(r).setValues(v)
}

function updateSheetContent(sheet, data)
{
  const tickers = data.tickers

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i]

    const row = ticker.row + headerRowOffset
    const range = 'C' + row + ':H' + row

    const info = [
      ticker.code,
      (ticker.isBought ? 'Y' : 'N'),
      ticker.expBuy,
      ticker.expSell,
      ticker.value,
      ticker.update]

    sheet.getRange(range).setValues([info])
  }
}

function getSheetContent(sheet)
{
  const range   = 'C' + headerRowOffset + ':F' + sheet.getLastRow()
  const values  = sheet.getRange(range).getValues()
  const records = []

  for (let i = 0; i < values.length; i++)
  {
    const row = values[i]

    const expBuy  = parseFloat(row[2])
    const expSell = parseFloat(row[3])

    records.push({
      row: i,
      code:     row[0],
      isBought: row[1] == 'Y',
      expBuy:   isNaN(expBuy)  ? null : expBuy,
      expSell:  isNaN(expSell) ? null : expSell,
    })
  }

  return records
}

function response(s, data)
{
  const res = { status: s }
  if (typeof data != 'undefined') {
    res.data = data
  }

  return ContentService
    .createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON)
}

function err(err, data)
{
  return { error: err, got: data }
}

function doGet(e)
{
  if (!isAuthorized(e))
    return response(HttpStatus.UNAUTHORIZED)

  try {
    return response(HttpStatus.OK, getSheetContent(sheet))
  }
  catch (ex) {
    return response(HttpStatus.INTERNAL_ERROR, err(ex, e))
  }
}

function doPost(e)
{
  if (!isAuthorized(e))
    return response(HttpStatus.UNAUTHORIZED)

  if (typeof e.postData == 'undefined')
    return response(HttpStatus.BAD_REQUEST)

  try {
    cleanAll(sheet)
    updateSheetContent(sheet, JSON.parse(e.postData.contents))

    return response(HttpStatus.OK)
  }
  catch (ex) {
    return response(HttpStatus.INTERNAL_ERROR, err(ex, e))
  }
}
