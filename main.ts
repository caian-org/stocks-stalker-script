/* Type aliases */

type PostEvent = GoogleAppsScript.Events.DoPost
type GetEvent = GoogleAppsScript.Events.DoGet
type HttpEvent = PostEvent | GetEvent

type Sheet = GoogleAppsScript.Spreadsheet.Sheet
type TextOutput = GoogleAppsScript.Content.TextOutput


/* Custom types */

enum HttpStatus
{
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  INTERNAL_ERROR = 500,
}

interface IHash
{
  [key: string]: any;
}

interface ITicker
{
  row: number;
  code: string;
  isBought: boolean;
  expBuy?: number;
  expSell?: number;
  value?: number;
  update?: string;
}


/* Globals */

const headerRowOffset = 3
const sheet = SpreadsheetApp.getActiveSheet()

const lastRow = sheet.getLastRow() >= headerRowOffset
  ? sheet.getLastRow()
  : headerRowOffset


/* Utils */

const times = (t: number) => Array.from(Array(t))


/* Sheet manipulation */

function cleanAll(sheet: Sheet): void
{
  if (lastRow === headerRowOffset) return

  const values = times(lastRow - headerRowOffset)
    .map((): string[] => (['', '', '', '', '', '']))

  sheet
    .getRange(`C${headerRowOffset}:H${lastRow}`)
    .setValues(values)
}

function updateSheetContent(sheet: Sheet, tickers: ITicker[]): void
{
  tickers.forEach((t: ITicker): void => {
    const row = t.row + headerRowOffset
    const values = [
      t.code,
      (t.isBought ? 'Y' : 'N'),
      t.expBuy,
      t.expSell,
      t.value,
      t.update
    ]

    sheet
      .getRange(`C${row}:H${row}`)
      .setValues([values])
  })
}

function getSheetContent(sheet: Sheet): ITicker[]
{
  const rows = sheet
    .getRange(`C${headerRowOffset}:F${lastRow}`)
    .getValues()

  return rows.map((row: string[], i: number): ITicker => {
    const code     = row[0]
    const isBought = row[1] === 'Y'
    const expBuy   = parseFloat(row[2]) || undefined
    const expSell  = parseFloat(row[3]) || undefined

    return { row: i, code, isBought, expBuy, expSell }
  })
}


/* Event helpers */

const errorEvent = (error: Error, eventData: HttpEvent) => ({ error, got: eventData })

function isAuthorized(e: HttpEvent)
{
  const accessToken = PropertiesService
    .getScriptProperties()
    .getProperty('ACCESS_TOKEN')

  return e.parameter['accessToken'] === accessToken
}

function response(status: HttpStatus, data?: any): TextOutput
{
  const res: IHash = { status }
  if (typeof(data) !== 'undefined') {
    res.data = data
  }

  return ContentService
    .createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON)
}


/* HTTP events */

function doGet(e: GetEvent)
{
  if (!isAuthorized(e))
    return response(HttpStatus.UNAUTHORIZED)

  try {
    return response(HttpStatus.OK, getSheetContent(sheet))
  }
  catch (ex) {
    return response(HttpStatus.INTERNAL_ERROR, errorEvent(ex, e))
  }
}

function doPost(e: PostEvent)
{
  if (!isAuthorized(e))
    return response(HttpStatus.UNAUTHORIZED)

  if (typeof(e.postData) === 'undefined')
    return response(HttpStatus.BAD_REQUEST)

  try {
    cleanAll(sheet)

    const { tickers } = JSON.parse(e.postData.contents)
    updateSheetContent(sheet, tickers)

    return response(HttpStatus.OK)
  }
  catch (ex) {
    return response(HttpStatus.INTERNAL_ERROR, errorEvent(ex, e))
  }
}
