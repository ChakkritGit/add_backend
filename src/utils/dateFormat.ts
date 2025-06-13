import { format, toDate } from 'date-fns'

const getDistanceTime = (distance: string): Date => {
  const date: Date = new Date()
  switch (distance) {
    case 'day':
      return toDate(
        format(
          new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          "yyyy-MM-dd'T'HH:mm:ss'Z'"
        )
      )
    case 'week':
      return toDate(
        format(
          new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd'T'HH:mm:ss'Z'"
        )
      )
    case 'month':
      return toDate(
        format(
          new Date(date.getFullYear(), date.getMonth() - 1, date.getDate()),
          "yyyy-MM-dd'T'HH:mm:ss'Z'"
        )
      )
    default:
      return toDate(format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'"))
  }
}

const getDateFormat = (datetime: string | number | Date): Date => {
  return toDate(format(datetime, "yyyy-MM-dd'T'HH:mm:ss'Z'"))
}

export { getDateFormat, getDistanceTime }
