// Native JavaScript date utilities to replace date-fns

export function format(date: Date, formatString: string): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "Invalid Date"
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()

  if (formatString === "MMM dd, yyyy") {
    return `${month} ${day.toString().padStart(2, "0")}, ${year}`
  } else if (formatString === "yyyy-MM-dd") {
    const monthNum = (date.getMonth() + 1).toString().padStart(2, "0")
    const dayNum = day.toString().padStart(2, "0")
    return `${year}-${monthNum}-${dayNum}`
  }

  return date.toLocaleDateString()
}

export function differenceInDays(date1: Date, date2: Date): number {
  if (!date1 || !(date1 instanceof Date) || isNaN(date1.getTime())) {
    console.error("[v0] Invalid date1 in differenceInDays:", date1)
    return 0
  }
  if (!date2 || !(date2 instanceof Date) || isNaN(date2.getTime())) {
    console.error("[v0] Invalid date2 in differenceInDays:", date2)
    return 0
  }

  const msPerDay = 1000 * 60 * 60 * 24
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate())
  return Math.floor((utc1 - utc2) / msPerDay)
}

export function differenceInBusinessDays(date1: Date, date2: Date): number {
  const start = date1 < date2 ? new Date(date1) : new Date(date2)
  const end = date1 < date2 ? new Date(date2) : new Date(date1)
  const sign = date1 < date2 ? -1 : 1

  let businessDays = 0
  const current = new Date(start)

  while (current < end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++
    }
    current.setDate(current.getDate() + 1)
  }

  return businessDays * sign
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let daysToAdd = Math.abs(days)
  const direction = days < 0 ? -1 : 1

  while (daysToAdd > 0) {
    result.setDate(result.getDate() + direction)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysToAdd--
    }
  }

  return result
}
