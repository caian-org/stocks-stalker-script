/* eslint-disable @typescript-eslint/no-unused-vars */

function returnGetSheetContent (): string {
  const ss = getActiveSheet()
  return JSON.stringify(getSheetContent(ss))
}
