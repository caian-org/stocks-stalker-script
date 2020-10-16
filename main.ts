/* Type aliases */

type PostEvent = GoogleAppsScript.Events.DoPost
type GetEvent = GoogleAppsScript.Events.DoGet
type HttpEvent = PostEvent | GetEvent

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

const sheet = SpreadsheetApp.getActiveSheet()

const headerRowsOffset = 3
const lastRow = sheet.getLastRow()
const sheetIsEmpty = lastRow < headerRowsOffset


/* Utils */

const times = (t: number) => Array.from(Array(t))


/* Sheet manipulation */

function cleanAll(): void
{
  if (sheetIsEmpty) return

  const values = times(lastRow - headerRowsOffset + 1)
    .map((): string[] => (['', '', '', '', '', '']))

  sheet
    .getRange(`C${headerRowsOffset}:H${lastRow}`)
    .setValues(values)
}

function updateSheetContent(tickers: ITicker[]): void
{
  tickers.forEach((t: ITicker): void => {
    const row = t.row + headerRowsOffset
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

function getSheetContent(): ITicker[]
{
  if (sheetIsEmpty) return []

  const rows = sheet
    .getRange(`C${headerRowsOffset}:F${lastRow}`)
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
    return response(HttpStatus.OK, getSheetContent())
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
    cleanAll()

    const { tickers } = JSON.parse(e.postData.contents)
    updateSheetContent(tickers)

    return response(HttpStatus.OK)
  }
  catch (ex) {
    return response(HttpStatus.INTERNAL_ERROR, errorEvent(ex, e))
  }
}
