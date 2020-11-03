/* Type aliases */

type PostEvent = GoogleAppsScript.Events.DoPost
type GetEvent = GoogleAppsScript.Events.DoGet
type HttpEvent = PostEvent | GetEvent

type Spreadsheet = GoogleAppsScript.Spreadsheet.Sheet
type TextOutput = GoogleAppsScript.Content.TextOutput

/* Custom types */

enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  INTERNAL_ERROR = 500
}

enum Sheet {
  TICKERS = 'tickers',
  DEBUG = 'debug',
  TEST = 'test'
}

interface IHash {
  [key: string]: any
}

interface ITicker {
  row: number
  code: string
  isBought: boolean
  expBuy?: number
  expSell?: number
  value?: number
  update?: string
}

/* Globals */

const document = SpreadsheetApp.getActiveSpreadsheet()
const headerRowsOffset = 3

const getActiveSheet = () => SpreadsheetApp.getActiveSheet()
const sheetIsEmpty = () => getActiveSheet().getLastRow() < headerRowsOffset

/* Event helpers */

const errorEvent = (error: Error, eventData: HttpEvent) => ({ error, got: eventData })

const isDebugRequest = (e: HttpEvent) =>
  Object.prototype.hasOwnProperty.call(e.parameter, 'isDebug')

function isAuthorized (e: HttpEvent) {
  const accessToken = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN')

  const p = e.parameter as IHash
  return p.accessToken === accessToken
}

function response (status: HttpStatus, data?: any): TextOutput {
  const res: IHash = { status }
  if (typeof data !== 'undefined') {
    res.data = data
  }

  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(
    ContentService.MimeType.JSON
  )
}

/* Sheet manipulation */

const setSheet = (name: string) => SpreadsheetApp.setActiveSheet(document.getSheetByName(name))

const loadSheetCond = (e: HttpEvent) =>
  isDebugRequest(e) ? setSheet(Sheet.DEBUG) : setSheet(Sheet.TICKERS)

function updateSheetContent (ss: Spreadsheet, tickers: ITicker[]): void {
  tickers.forEach((t: ITicker): void => {
    const row = t.row + headerRowsOffset
    const values = [t.code, t.isBought ? 'Y' : 'N', t.expBuy, t.expSell, t.value, t.update]

    ss.getRange(`C${row}:H${row}`).setValues([values])
  })
}

function getSheetContent (ss: Spreadsheet): ITicker[] {
  if (sheetIsEmpty()) return []

  return ss.getRange(`C${headerRowsOffset}:F${ss.getLastRow()}`).getValues()
    .map(
      (row: string[], i: number): ITicker => {
        const code = row[0].trim()
        const isBought = row[1] === 'Y'
        const expBuy = parseFloat(row[2]) || undefined
        const expSell = parseFloat(row[3]) || undefined

        return { row: i, code, isBought, expBuy, expSell }
      }
    )
    .filter((ticker: ITicker): boolean => ticker.code !== '')
}

/* HTTP events */

/* eslint-disable-next-line */
function doGet(e: GetEvent) {
  if (!isAuthorized(e)) {
    return response(HttpStatus.UNAUTHORIZED)
  }

  loadSheetCond(e)
  const ss = getActiveSheet()

  try {
    const data = {
      activeSheet: getActiveSheet().getSheetName(),
      isDebug: isDebugRequest(e),
      content: getSheetContent(ss)
    }

    return response(HttpStatus.OK, data)
  } catch (ex) {
    return response(HttpStatus.INTERNAL_ERROR, errorEvent(ex, e))
  }
}

/* eslint-disable-next-line */
function doPost(e: PostEvent) {
  if (!isAuthorized(e)) {
    return response(HttpStatus.UNAUTHORIZED)
  }

  if (typeof e.postData === 'undefined') {
    return response(HttpStatus.BAD_REQUEST)
  }

  loadSheetCond(e)
  const ss = getActiveSheet()

  try {
    const { tickers } = JSON.parse(e.postData.contents)
    updateSheetContent(ss, tickers)

    return response(HttpStatus.OK)
  } catch (ex) {
    return response(HttpStatus.INTERNAL_ERROR, errorEvent(ex, e))
  }
}
