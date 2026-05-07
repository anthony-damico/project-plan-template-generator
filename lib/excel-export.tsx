import type { CalculatedProject, ProjectConfig, MilestoneStatus, CalculatedDatabase, CalculatedProduct } from "./types"
import { addBusinessDays } from "./date-utils"

function dateToExcelSerial(date: Date): number {
  const epoch = new Date(1899, 11, 30)
  const msPerDay = 86400000
  return (date.getTime() - epoch.getTime()) / msPerDay
}

interface MilestoneStatusData {
  status: MilestoneStatus
  actualStartDate?: Date
  actualEndDate?: Date
}

// Helper function to calculate chained forecast end date
function calculateChainedForecastEndDate(
  milestones: Array<{ name: string; durationWeeks: number; plannedEndDate: Date }>,
  statusData: Record<string, MilestoneStatusData>,
  previousMilestoneEnd: Date,
): Date | null {
  let currentForecastEnd: Date = previousMilestoneEnd

  for (const milestone of milestones) {
    const status = statusData[milestone.name]

    if (status?.actualEndDate) {
      // Milestone is complete, use actual end date
      currentForecastEnd = status.actualEndDate
    } else if (status?.actualStartDate) {
      // Milestone is in progress, forecast from actual start + planned duration
      const plannedDurationDays = milestone.durationWeeks * 5
      currentForecastEnd = addBusinessDays(status.actualStartDate, plannedDurationDays)
    } else {
      // Milestone not started, forecast from previous milestone's end + planned duration
      const plannedDurationDays = milestone.durationWeeks * 5
      currentForecastEnd = addBusinessDays(currentForecastEnd, plannedDurationDays)
    }
  }

  return currentForecastEnd
}

// Helper function to calculate workday difference
function calculateWorkdayDifference(plannedDate: Date, actualDate: Date): number {
  if (plannedDate.getTime() === actualDate.getTime()) return 0

  const sign = actualDate > plannedDate ? 1 : -1
  const start = actualDate > plannedDate ? plannedDate : actualDate
  const end = actualDate > plannedDate ? actualDate : actualDate

  let workdays = 0
  const current = new Date(start)

  while (current < end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays++
    }
    current.setDate(current.getDate() + 1)
  }

  return sign * workdays
}

export async function exportToExcel(
  project: CalculatedProject,
  config: ProjectConfig,
  milestoneStatuses: Record<string, Record<string, MilestoneStatusData>>,
) {
  try {
    const ExcelJSModule = await import("exceljs")
    const ExcelJS = ExcelJSModule.default

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Project Plan")

    const headerFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FF4A90E2" }, // Light blue
    }

    const headerFont = {
      bold: true,
      color: { argb: "FFFFFFFF" }, // White text
      size: 11,
    }

    const sectionHeaderFont = {
      bold: true,
      size: 12,
    }

    const inProgressFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FFD1ECF1" }, // Light blue/cyan for in progress
    }

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Milestone
      { width: 15 }, // Status
      { width: 18 }, // Duration
      { width: 15 }, // Planned Start
      { width: 15 }, // Planned End
      { width: 15 }, // Actual Start
      { width: 15 }, // Actual End
      { width: 20 }, // Start Variance
      { width: 20 }, // End Variance
      { width: 25 }, // Milestone Variance
    ]

    let currentRow = 1

    // Title
    const titleCell = worksheet.getCell(currentRow, 1)
    titleCell.value = "Project Plan Template"
    titleCell.font = { bold: true, size: 14 }
    currentRow += 2

    // Project Info
    worksheet.getCell(currentRow, 1).value = "Project Name:"
    worksheet.getCell(currentRow, 2).value = project.projectName
    currentRow++

    const projectUpdateCell = worksheet.getCell(currentRow, 2)
    projectUpdateCell.value = dateToExcelSerial(new Date(project.projectStartDate))
    projectUpdateCell.numFmt = "dd/mm/yyyy"
    worksheet.getCell(currentRow, 1).value = "Project Start Date:"
    const projectUpdateRow = currentRow
    currentRow++

    worksheet.getCell(currentRow, 1).value = "Execution Mode:"
    worksheet.getCell(currentRow, 2).value = project.executionMode
    currentRow += 2

    const connectionStatus = milestoneStatuses["_project"]?.[project.connectionMilestone.name] || {
      status: "Not started",
    }

    // Setup & Implementations section heading
    const setupHeaderCell = worksheet.getCell(currentRow, 1)
    setupHeaderCell.value = "INITIAL SETUP"
    setupHeaderCell.font = sectionHeaderFont
    currentRow++

    // Header row for connection milestone
    const connectionHeaderRow = worksheet.getRow(currentRow)
    const headers = [
      "Milestone",
      "Status",
      "Duration (weeks)",
      "Planned Start",
      "Planned End",
      "Actual Start",
      "Actual End",
      "Start Variance (days)",
      "End Variance (days)",
      "Milestone Variance (Days)",
    ]
    headers.forEach((header, index) => {
      const cell = connectionHeaderRow.getCell(index + 1)
      cell.value = header
      cell.fill = headerFill
      cell.font = headerFont
    })
    currentRow++

    // Connection milestone
    const connectionRow = currentRow
    worksheet.getCell(connectionRow, 1).value = project.connectionMilestone.name

    const connectionStatusCell = worksheet.getCell(connectionRow, 2)
    connectionStatusCell.value = connectionStatus.status
    connectionStatusCell.dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"Not started,In progress,Complete,On Hold"'],
    }

    worksheet.getCell(connectionRow, 3).value = project.connectionMilestone.durationWeeks

    // Planned Start - references Project Update Date
    const connectionPlannedStartCell = worksheet.getCell(connectionRow, 4)
    connectionPlannedStartCell.value = { formula: `B${projectUpdateRow}` }
    connectionPlannedStartCell.numFmt = "dd/mm/yyyy"

    // Planned End
    const connectionPlannedEndCell = worksheet.getCell(connectionRow, 5)
    connectionPlannedEndCell.value = { formula: `WORKDAY(D${connectionRow},C${connectionRow}*5)` }
    connectionPlannedEndCell.numFmt = "dd/mm/yyyy"

    const connectionActualStartCell = worksheet.getCell(connectionRow, 6)
    if (connectionStatus.actualStartDate) {
      connectionActualStartCell.value = dateToExcelSerial(connectionStatus.actualStartDate)
    }
    connectionActualStartCell.numFmt = "dd/mm/yyyy"
    connectionActualStartCell.dataValidation = {
      type: "date",
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Invalid Date",
      error: "Please enter a valid date",
    }

    const connectionActualEndCell = worksheet.getCell(connectionRow, 7)
    if (connectionStatus.actualEndDate) {
      connectionActualEndCell.value = dateToExcelSerial(connectionStatus.actualEndDate)
    }
    connectionActualEndCell.numFmt = "dd/mm/yyyy"
    connectionActualEndCell.dataValidation = {
      type: "date",
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Invalid Date",
      error: "Please enter a valid date",
    }

    // Start Variance
    const connectionStartVarianceCell = worksheet.getCell(connectionRow, 8)
    connectionStartVarianceCell.value = {
      formula: `IF(F${connectionRow}<>"",IF(D${connectionRow}=F${connectionRow},0,SIGN(F${connectionRow}-D${connectionRow})*(NETWORKDAYS(MIN(D${connectionRow},F${connectionRow}),MAX(D${connectionRow},F${connectionRow}))-1)),"")`,
    }

    // End Variance
    const connectionEndVarianceCell = worksheet.getCell(connectionRow, 9)
    connectionEndVarianceCell.value = {
      formula: `IF(G${connectionRow}<>"",IF(E${connectionRow}=G${connectionRow},0,SIGN(G${connectionRow}-E${connectionRow})*(NETWORKDAYS(MIN(E${connectionRow},G${connectionRow}),MAX(E${connectionRow},G${connectionRow}))-1)),"")`,
    }

    // Milestone Variance calculation - only calculate if there's actual data in H or I
    const connectionMilestoneVarianceCell = worksheet.getCell(connectionRow, 10)
    connectionMilestoneVarianceCell.value = {
      formula: `IF(OR(H${connectionRow}<>"",I${connectionRow}<>""),IF(AND(H${connectionRow}<>"",I${connectionRow}<>""),I${connectionRow}-H${connectionRow},IF(H${connectionRow}<>"",H${connectionRow},IF(I${connectionRow}<> "",I${connectionRow},0))),"")`,
    }

    const connectionPlannedStart = new Date(project.projectStartDate)
    const connectionPlannedEnd = addBusinessDays(connectionPlannedStart, project.connectionMilestone.durationWeeks * 5)

    if (connectionStatus.actualStartDate || connectionStatus.actualEndDate) {
      let varianceValue = 0
      if (connectionStatus.actualStartDate && connectionStatus.actualEndDate) {
        const startVariance = calculateWorkdayDifference(connectionPlannedStart, connectionStatus.actualStartDate)
        const endVariance = calculateWorkdayDifference(connectionPlannedEnd, connectionStatus.actualEndDate)
        varianceValue = endVariance - startVariance
      } else if (connectionStatus.actualStartDate) {
        varianceValue = calculateWorkdayDifference(connectionPlannedStart, connectionStatus.actualStartDate)
      }

      if (varianceValue <= 0) {
        connectionMilestoneVarianceCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD4EDDA" },
        }
        connectionMilestoneVarianceCell.font = {
          color: { argb: "FF155724" },
        }
      } else if (varianceValue >= 1 && varianceValue <= 5) {
        connectionMilestoneVarianceCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF3CD" },
        }
        connectionMilestoneVarianceCell.font = {
          color: { argb: "FF856404" },
        }
      } else if (varianceValue > 5) {
        connectionMilestoneVarianceCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8D7DA" },
        }
        connectionMilestoneVarianceCell.font = {
          color: { argb: "FF721C24" },
        }
      }
    }

    // CHANGE: Reduced spacing from += 2 to ++ to eliminate blank row between connection details and product implementations
    currentRow++

    // Track all milestone rows for batch conditional formatting
    const allMilestoneRows: number[] = [connectionRow]

    // CHANGE: Fixed: Remove duplicate "SETUP & IMPLEMENTATIONS" header and add product implementations under the same header
    if (project.setupMilestones && project.setupMilestones.length > 1) {
      // Skip the first setup milestone (it's the connection milestone we already added)
      // Add the remaining setup milestones (product implementations) without a duplicate header
      const setupMilestonesToAdd = project.setupMilestones.slice(1)

      setupMilestonesToAdd.forEach((setupMilestone) => {
        const setupRow = currentRow
        worksheet.getCell(setupRow, 1).value = setupMilestone.name

        const setupStatusCell = worksheet.getCell(setupRow, 2)
        const setupStatus = milestoneStatuses["_project"]?.[setupMilestone.name] || { status: "Not started" }
        setupStatusCell.value = setupStatus.status
        setupStatusCell.dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: ['"Not started,In progress,Complete,On Hold"'],
        }

        worksheet.getCell(setupRow, 3).value = setupMilestone.durationWeeks

        const setupPlannedStartCell = worksheet.getCell(setupRow, 4)
        // Product implementations start at the same time as connection details
        setupPlannedStartCell.value = { formula: `D${connectionRow}` }
        setupPlannedStartCell.numFmt = "dd/mm/yyyy"

        const setupPlannedEndCell = worksheet.getCell(setupRow, 5)
        setupPlannedEndCell.value = { formula: `WORKDAY(D${setupRow},C${setupRow}*5)` }
        setupPlannedEndCell.numFmt = "dd/mm/yyyy"

        const setupActualStartCell = worksheet.getCell(setupRow, 6)
        if (setupStatus.actualStartDate) {
          setupActualStartCell.value = dateToExcelSerial(setupStatus.actualStartDate)
        }
        setupActualStartCell.numFmt = "dd/mm/yyyy"
        setupActualStartCell.dataValidation = {
          type: "date",
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: "Invalid Date",
          error: "Please enter a valid date",
        }

        const setupActualEndCell = worksheet.getCell(setupRow, 7)
        if (setupStatus.actualEndDate) {
          setupActualEndCell.value = dateToExcelSerial(setupStatus.actualEndDate)
        }
        setupActualEndCell.numFmt = "dd/mm/yyyy"
        setupActualEndCell.dataValidation = {
          type: "date",
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: "Invalid Date",
          error: "Please enter a valid date",
        }

        const setupStartVarianceCell = worksheet.getCell(setupRow, 8)
        setupStartVarianceCell.value = {
          formula: `IF(F${setupRow}<>"",IF(D${setupRow}=F${setupRow},0,SIGN(F${setupRow}-D${setupRow})*(NETWORKDAYS(MIN(D${setupRow},F${setupRow}),MAX(D${setupRow},F${setupRow}))-1)),"")`,
        }

        const setupEndVarianceCell = worksheet.getCell(setupRow, 9)
        setupEndVarianceCell.value = {
          formula: `IF(G${setupRow}<>"",IF(E${setupRow}=G${setupRow},0,SIGN(G${setupRow}-E${setupRow})*(NETWORKDAYS(MIN(E${setupRow},G${setupRow}),MAX(E${setupRow},G${setupRow}))-1)),"")`,
        }

        const setupMilestoneVarianceCell = worksheet.getCell(setupRow, 10)
        setupMilestoneVarianceCell.value = {
          formula: `IF(OR(H${setupRow}<>"",I${setupRow}<>""),IF(AND(H${setupRow}<>"",I${setupRow}<>""),I${setupRow}-H${setupRow},IF(H${setupRow}<>"",H${setupRow},IF(I${setupRow}<> "",I${setupRow},0))),"")`,
        }
        currentRow++
        allMilestoneRows.push(setupRow)
      })
    }

    currentRow++

    // Track last deliverable end row instead of just database
    let lastDeliverableEndRow = connectionRow
    const lastDbEndRow = connectionRow

    project.deliverables.forEach((deliverable, deliverableIndex) => {
      const isDatabase =
        "milestones" in deliverable &&
        deliverable.milestones.some((m) => m.name.includes("Get data") || m.name.includes("Build database"))

      if (isDatabase) {
        const db = deliverable as CalculatedDatabase
        // Database header
        const dbHeaderCell = worksheet.getCell(currentRow, 1)
        dbHeaderCell.value = `${deliverableIndex + 1} - ${db.type}`
        dbHeaderCell.font = sectionHeaderFont
        currentRow++

        // Forecast End Date row
        const forecastRow = currentRow
        worksheet.getCell(forecastRow, 1).value = "Forecast End Date:"
        worksheet.getCell(forecastRow, 1).font = { bold: true, italic: true }

        const dbMilestones = db.milestones
        const dbStatusData = milestoneStatuses[db.id] || {}

        const forecastCell = worksheet.getCell(forecastRow, 2)

        const firstMilestoneRow = currentRow + 2 // +1 for header, +1 for first milestone
        const lastMilestoneRow = firstMilestoneRow + dbMilestones.length - 1

        forecastCell.value = {
          formula: `WORKDAY(E${lastMilestoneRow},SUM(J${firstMilestoneRow}:J${lastMilestoneRow}))`,
        }
        forecastCell.numFmt = "dd/mm/yyyy"
        forecastCell.font = { bold: true }

        // Variance display in column C
        const varianceCell = worksheet.getCell(forecastRow, 3)
        varianceCell.value = {
          formula: `IF(B${forecastRow}<>"",IF(SUM(J${firstMilestoneRow}:J${lastMilestoneRow})=0,"(On time)",IF(SUM(J${firstMilestoneRow}:J${lastMilestoneRow})>0,"(+"&SUM(J${firstMilestoneRow}:J${lastMilestoneRow})&" days late)","("&SUM(J${firstMilestoneRow}:J${lastMilestoneRow})&" days early)")),"")`,
        }
        varianceCell.font = { italic: true }

        // Conditional formatting for variance color
        worksheet.addConditionalFormatting({
          ref: `C${forecastRow}`,
          rules: [
            {
              type: "containsText",
              operator: "containsText",
              text: "late",
              style: {
                font: { color: { argb: "FFEF4444" } },
              },
            },
          ],
        })

        worksheet.addConditionalFormatting({
          ref: `C${forecastRow}`,
          rules: [
            {
              type: "containsText",
              operator: "containsText",
              text: "early",
              style: {
                font: { color: { argb: "FF10B981" } },
              },
            },
          ],
        })

        worksheet.addConditionalFormatting({
          ref: `C${forecastRow}`,
          rules: [
            {
              type: "containsText",
              operator: "containsText",
              text: "On time",
              style: {
                font: { color: { argb: "FF10B981" } },
              },
            },
          ],
        })

        currentRow++

        // CHANGE: Updated database deliverable headers to match Initial Setup format
        // Column headers
        const headerRow = worksheet.getRow(currentRow)
        const headers = [
          "Milestone",
          "Status",
          "Duration (weeks)",
          "Planned Start",
          "Planned End",
          "Actual Start",
          "Actual End",
          "Start Variance (days)",
          "End Variance (days)",
          "Milestone Variance (Days)",
        ]
        headers.forEach((header, index) => {
          const cell = headerRow.getCell(index + 1)
          cell.value = header
          cell.fill = headerFill
          cell.font = headerFont
        })
        currentRow++

        const milestoneStartRow = currentRow
        const milestoneCount = dbMilestones.length

        // CHANGE: Updated milestone data columns to match new header order
        dbMilestones.forEach((milestone, milestoneIndex) => {
          if (deliverable.type === "Sales") {
            console.log(
              `[v0] Writing Sales milestone: ${milestone.name}, duration=${milestone.durationWeeks}w, row=${currentRow}`,
            )
          }

          const row = worksheet.getRow(currentRow)
          const statusData = dbStatusData[milestone.name]

          row.getCell(1).value = milestone.name
          
          const statusCell = row.getCell(2)
          statusCell.value = statusData?.status || milestone.status
          statusCell.dataValidation = {
            type: "list",
            allowBlank: false,
            formulae: ['"Not started,In progress,Complete,On Hold"'],
          }
          
          row.getCell(3).value = milestone.durationWeeks

          const plannedStartCell = row.getCell(4)
          // First milestone of deliverable references previous deliverable's last milestone end date
          // Subsequent milestones reference previous milestone's end date + 1 working day
          if (milestoneIndex === 0) {
            // First milestone - reference previous deliverable's end date (column E)
            plannedStartCell.value = {
              formula: `WORKDAY(E${lastDeliverableEndRow},1)`,
            }
          } else {
            // Subsequent milestones - reference previous row's end date + 1 working day
            plannedStartCell.value = {
              formula: `WORKDAY(E${currentRow - 1},1)`,
            }
          }
          plannedStartCell.numFmt = "dd/mm/yyyy"

          const plannedEndCell = row.getCell(5)
          // Planned End = Planned Start + (Duration in weeks * 5 working days) - 1 (because start day counts)
          plannedEndCell.value = {
            formula: `WORKDAY(D${currentRow},C${currentRow}*5-1)`,
          }
          plannedEndCell.numFmt = "dd/mm/yyyy"

          const actualStartCell = row.getCell(6)
          actualStartCell.value = statusData?.actualStartDate
            ? dateToExcelSerial(new Date(statusData.actualStartDate))
            : ""
          actualStartCell.numFmt = "dd/mm/yyyy"
          actualStartCell.dataValidation = {
            type: "date",
            allowBlank: true,
            showErrorMessage: true,
            errorTitle: "Invalid Date",
            error: "Please enter a valid date",
          }

          const actualEndCell = row.getCell(7)
          actualEndCell.value = statusData?.actualEndDate ? dateToExcelSerial(new Date(statusData.actualEndDate)) : ""
          actualEndCell.numFmt = "dd/mm/yyyy"
          actualEndCell.dataValidation = {
            type: "date",
            allowBlank: true,
            showErrorMessage: true,
            errorTitle: "Invalid Date",
            error: "Please enter a valid date",
          }

          // Start Variance (days)
          row.getCell(8).value = {
            formula: `IF(F${currentRow}<>"",NETWORKDAYS(D${currentRow},F${currentRow}),0)`,
          }
          row.getCell(8).numFmt = "0"

          // End Variance (days)
          row.getCell(9).value = {
            formula: `IF(G${currentRow}<>"",NETWORKDAYS(E${currentRow},G${currentRow}),0)`,
          }
          row.getCell(9).numFmt = "0"

          // Milestone Variance (Days)
          row.getCell(10).value = {
            formula: `H${currentRow}+I${currentRow}`,
          }
          row.getCell(10).numFmt = "0"

          // Add this milestone row to the array for conditional formatting
          allMilestoneRows.push(currentRow)

          currentRow++
        })
        
        // Update last deliverable end row for next deliverable
        lastDeliverableEndRow = currentRow - 1

        currentRow++
      } else {
        // Product
        const product = deliverable as CalculatedProduct
        const productHeaderCell = worksheet.getCell(currentRow, 1)
        const productName = product.type === "B&F" ? "Budget and Forecast" : product.type
        productHeaderCell.value = `${deliverableIndex + 1} - ${productName}`
        productHeaderCell.font = sectionHeaderFont
        currentRow++

        // Forecast End Date row
        const forecastRow = currentRow
        worksheet.getCell(forecastRow, 1).value = "Forecast End Date:"
        worksheet.getCell(forecastRow, 1).font = { bold: true, italic: true }

        const productMilestones = product.milestones
        const productStatusData = milestoneStatuses[product.id] || {}

        const forecastCell = worksheet.getCell(forecastRow, 2)

        const firstMilestoneRow = currentRow + 2 // +1 for header, +1 for first milestone
        const lastMilestoneRow = firstMilestoneRow + productMilestones.length - 1

        forecastCell.value = {
          formula: `WORKDAY(E${lastMilestoneRow},SUM(J${firstMilestoneRow}:J${lastMilestoneRow}))`,
        }
        forecastCell.numFmt = "dd/mm/yyyy"
        forecastCell.font = { bold: true }

        // Variance display in column C
        const varianceCell = worksheet.getCell(forecastRow, 3)
        varianceCell.value = {
          formula: `IF(B${forecastRow}<>"",IF(SUM(J${firstMilestoneRow}:J${lastMilestoneRow})=0,"(On time)",IF(SUM(J${firstMilestoneRow}:J${lastMilestoneRow})>0,"(+"&SUM(J${firstMilestoneRow}:J${lastMilestoneRow})&" days late)","("&SUM(J${firstMilestoneRow}:J${lastMilestoneRow})&" days early)")),"")`,
        }
        varianceCell.font = { italic: true }

        // Conditional formatting for variance color
        worksheet.addConditionalFormatting({
          ref: `C${forecastRow}`,
          rules: [
            {
              type: "containsText",
              operator: "containsText",
              text: "late",
              style: {
                font: { color: { argb: "FFEF4444" } },
              },
            },
          ],
        })

        worksheet.addConditionalFormatting({
          ref: `C${forecastRow}`,
          rules: [
            {
              type: "containsText",
              operator: "containsText",
              text: "early",
              style: {
                font: { color: { argb: "FF10B981" } },
              },
            },
          ],
        })

        worksheet.addConditionalFormatting({
          ref: `C${forecastRow}`,
          rules: [
            {
              type: "containsText",
              operator: "containsText",
              text: "On time",
              style: {
                font: { color: { argb: "FF10B981" } },
              },
            },
          ],
        })

        currentRow++

        // CHANGE: Updated product deliverable headers to match Initial Setup format
        // Column headers
        const headerRow = worksheet.getRow(currentRow)
        const headers = [
          "Milestone",
          "Status",
          "Duration (weeks)",
          "Planned Start",
          "Planned End",
          "Actual Start",
          "Actual End",
          "Start Variance (days)",
          "End Variance (days)",
          "Milestone Variance (Days)",
        ]
        headers.forEach((header, index) => {
          const cell = headerRow.getCell(index + 1)
          cell.value = header
          cell.fill = headerFill
          cell.font = headerFont
        })
        currentRow++

        const milestoneStartRow = currentRow
        const milestoneCount = productMilestones.length

        // CHANGE: Updated milestone data columns to match new header order
        productMilestones.forEach((milestone, milestoneIndex) => {
          const row = worksheet.getRow(currentRow)
          const statusData = productStatusData[milestone.name]

          row.getCell(1).value = milestone.name
          
          const statusCell = row.getCell(2)
          statusCell.value = statusData?.status || milestone.status
          statusCell.dataValidation = {
            type: "list",
            allowBlank: false,
            formulae: ['"Not started,In progress,Complete,On Hold"'],
          }
          
          row.getCell(3).value = milestone.durationWeeks

          const plannedStartCell = row.getCell(4)
          // First milestone of deliverable references previous deliverable's last milestone end date
          // Subsequent milestones reference previous milestone's end date + 1 working day
          if (milestoneIndex === 0) {
            // First milestone - reference previous deliverable's end date (column E)
            plannedStartCell.value = {
              formula: `WORKDAY(E${lastDeliverableEndRow},1)`,
            }
          } else {
            // Subsequent milestones - reference previous row's end date + 1 working day
            plannedStartCell.value = {
              formula: `WORKDAY(E${currentRow - 1},1)`,
            }
          }
          plannedStartCell.numFmt = "dd/mm/yyyy"

          const plannedEndCell = row.getCell(5)
          // Planned End = Planned Start + (Duration in weeks * 5 working days) - 1 (because start day counts)
          plannedEndCell.value = {
            formula: `WORKDAY(D${currentRow},C${currentRow}*5-1)`,
          }
          plannedEndCell.numFmt = "dd/mm/yyyy"

          const actualStartCell = row.getCell(6)
          actualStartCell.value = statusData?.actualStartDate
            ? dateToExcelSerial(new Date(statusData.actualStartDate))
            : ""
          actualStartCell.numFmt = "dd/mm/yyyy"
          actualStartCell.dataValidation = {
            type: "date",
            allowBlank: true,
            showErrorMessage: true,
            errorTitle: "Invalid Date",
            error: "Please enter a valid date",
          }

          const actualEndCell = row.getCell(7)
          actualEndCell.value = statusData?.actualEndDate ? dateToExcelSerial(new Date(statusData.actualEndDate)) : ""
          actualEndCell.numFmt = "dd/mm/yyyy"
          actualEndCell.dataValidation = {
            type: "date",
            allowBlank: true,
            showErrorMessage: true,
            errorTitle: "Invalid Date",
            error: "Please enter a valid date",
          }

          // Start Variance (days)
          row.getCell(8).value = {
            formula: `IF(F${currentRow}<>"",NETWORKDAYS(D${currentRow},F${currentRow}),0)`,
          }
          row.getCell(8).numFmt = "0"

          // End Variance (days)
          row.getCell(9).value = {
            formula: `IF(G${currentRow}<>"",NETWORKDAYS(E${currentRow},G${currentRow}),0)`,
          }
          row.getCell(9).numFmt = "0"

          // Milestone Variance (Days)
          row.getCell(10).value = {
            formula: `H${currentRow}+I${currentRow}`,
          }
          row.getCell(10).numFmt = "0"

          // Add this milestone row to the array for conditional formatting
          allMilestoneRows.push(currentRow)

          currentRow++
        })
        
        // Update last deliverable end row for next deliverable
        lastDeliverableEndRow = currentRow - 1

        currentRow++
      }
    })

    const lastProductEndRow = currentRow - 1

    console.log("[v0] allMilestoneRows for conditional formatting:", allMilestoneRows)

    // This prevents conflicts and ensures proper priority
    allMilestoneRows.forEach((row) => {
      // Strikethrough for completed items (columns A-E only)
      worksheet.addConditionalFormatting({
        ref: `A${row}:E${row}`,
        rules: [
          {
            type: "expression",
            priority: 1,
            formulae: [`$B${row}="Complete"`],
            style: {
              font: { strike: true },
            },
          },
        ],
      })

      // Yellow background for in progress items (columns A-E only)
      worksheet.addConditionalFormatting({
        ref: `A${row}:E${row}`,
        rules: [
          {
            type: "expression",
            priority: 2,
            formulae: [`$B${row}="In progress"`],
            style: {
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD1ECF1" }, // Light blue/cyan for in progress
                bgColor: { argb: "FFD1ECF1" },
              },
            },
          },
        ],
      })

      // Green for on time/early (<=0)
      worksheet.addConditionalFormatting({
        ref: `H${row}`,
        rules: [
          {
            type: "expression",
            priority: 3,
            formulae: [`AND(ISNUMBER(H${row}),H${row}<=0)`],
            style: {
              font: { color: { argb: "FF155724" } },
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD4EDDA" },
                bgColor: { argb: "FFD4EDDA" },
              },
            },
          },
        ],
      })

      // Amber for 1-5 days late
      worksheet.addConditionalFormatting({
        ref: `H${row}`,
        rules: [
          {
            type: "expression",
            priority: 4,
            formulae: [`AND(ISNUMBER(H${row}),H${row}>=1,H${row}<=5)`],
            style: {
              font: { color: { argb: "FF856404" } },
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFF3CD" },
                bgColor: { argb: "FFFFF3CD" },
              },
            },
          },
        ],
      })

      // Red for more than 5 days late
      worksheet.addConditionalFormatting({
        ref: `H${row}`,
        rules: [
          {
            type: "expression",
            priority: 5,
            formulae: [`AND(ISNUMBER(H${row}),H${row}>5)`],
            style: {
              font: { color: { argb: "FF721C24" } },
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF8D7DA" },
                bgColor: { argb: "FFF8D7DA" },
              },
            },
          },
        ],
      })

      // Green for on time/early (<=0)
      worksheet.addConditionalFormatting({
        ref: `I${row}`,
        rules: [
          {
            type: "expression",
            priority: 6,
            formulae: [`AND(ISNUMBER(I${row}),I${row}<=0)`],
            style: {
              font: { color: { argb: "FF155724" } },
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD4EDDA" },
                bgColor: { argb: "FFD4EDDA" },
              },
            },
          },
        ],
      })

      // Amber for 1-5 days late
      worksheet.addConditionalFormatting({
        ref: `I${row}`,
        rules: [
          {
            type: "expression",
            priority: 7,
            formulae: [`AND(ISNUMBER(I${row}),I${row}>=1,I${row}<=5)`],
            style: {
              font: { color: { argb: "FF856404" } },
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFF3CD" },
                bgColor: { argb: "FFFFF3CD" },
              },
            },
          },
        ],
      })

      // Red for more than 5 days late
      worksheet.addConditionalFormatting({
        ref: `I${row}`,
        rules: [
          {
            type: "expression",
            priority: 8,
            formulae: [`AND(ISNUMBER(I${row}),I${row}>5)`],
            style: {
              font: { color: { argb: "FF721C24" } },
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF8D7DA" },
                bgColor: { argb: "FFF8D7DA" },
              },
            },
          },
        ],
      })

      // Green background and text for negative/zero values (on time or early)
      worksheet.addConditionalFormatting({
        ref: `J${row}`,
        rules: [
          {
            type: "expression",
            priority: 9,
            formulae: [`AND(ISNUMBER(J${row}),J${row}<=0)`],
            style: {
              font: { color: { argb: "FF155724" }, bold: true },
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD4EDDA" },
                bgColor: { argb: "FFD4EDDA" },
              },
            },
          },
        ],
      })

      // Amber/yellow background and text for 1-5 days late
      worksheet.addConditionalFormatting({
        ref: `J${row}`,
        rules: [
          {
            type: "expression",
            priority: 10,
            formulae: [`AND(ISNUMBER(J${row}),J${row}>=1,J${row}<=5)`],
            style: {
              font: { color: { argb: "FF856404" }, bold: true },
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFF3CD" },
                bgColor: { argb: "FFFFF3CD" },
              },
            },
          },
        ],
      })

      // Red background and text for more than 5 days late
      worksheet.addConditionalFormatting({
        ref: `J${row}`,
        rules: [
          {
            type: "expression",
            priority: 11,
            formulae: [`AND(ISNUMBER(J${row}),J${row}>5)`],
            style: {
              font: { color: { argb: "FF721C24" }, bold: true },
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF8D7DA" },
                bgColor: { argb: "FFF8D7DA" },
              },
            },
          },
        ],
      })
    })

    const ganttSheet = workbook.addWorksheet("Gantt Chart")

    // Calculate project timeline in weeks
    const projectStart = new Date(project.projectStartDate)
    const projectEnd = new Date(project.projectEndDate)
    const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
    const totalWeeks = Math.ceil(totalDays / 7)

    // Set up Gantt chart columns
    ganttSheet.columns = [
      { width: 30 }, // Task name
      { width: 15 }, // Start date
      { width: 15 }, // End date
      { width: 12 }, // Duration
      ...Array(totalWeeks).fill({ width: 5 }), // Weekly timeline columns
    ]

    let ganttRow = 1

    // Title
    const ganttTitleCell = ganttSheet.getCell(ganttRow, 1)
    ganttTitleCell.value = "Gantt Chart (Weekly View)"
    ganttTitleCell.font = { bold: true, size: 14 }
    ganttRow += 2

    // Headers
    ganttSheet.getCell(ganttRow, 1).value = "Task"
    ganttSheet.getCell(ganttRow, 1).font = headerFont
    ganttSheet.getCell(ganttRow, 1).fill = headerFill

    ganttSheet.getCell(ganttRow, 2).value = "Start Date"
    ganttSheet.getCell(ganttRow, 2).font = headerFont
    ganttSheet.getCell(ganttRow, 2).fill = headerFill

    ganttSheet.getCell(ganttRow, 3).value = "End Date"
    ganttSheet.getCell(ganttRow, 3).font = headerFont
    ganttSheet.getCell(ganttRow, 3).fill = headerFill

    ganttSheet.getCell(ganttRow, 4).value = "Duration"
    ganttSheet.getCell(ganttRow, 4).font = headerFont
    ganttSheet.getCell(ganttRow, 4).fill = headerFill

    for (let week = 0; week < totalWeeks; week++) {
      const weekStart = new Date(projectStart)
      weekStart.setDate(weekStart.getDate() + week * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const cell = ganttSheet.getCell(ganttRow, 5 + week)
      cell.value = `W${week + 1}`
      cell.font = { size: 9, bold: true }
      cell.alignment = { horizontal: "center", textRotation: 90 }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8E8E8" },
      }
    }

    ganttRow++
    const dataStartRow = ganttRow

    ganttSheet.getCell(ganttRow, 1).value = project.connectionMilestone.name
    ganttSheet.getCell(ganttRow, 1).font = { bold: true }

    // Reference dates from Project Plan sheet
    const connStartCell = ganttSheet.getCell(ganttRow, 2)
    connStartCell.value = { formula: `'Project Plan'!D${connectionRow}` }
    connStartCell.numFmt = "dd/mm/yyyy"

    const connEndCell = ganttSheet.getCell(ganttRow, 3)
    connEndCell.value = { formula: `'Project Plan'!E${connectionRow}` }
    connEndCell.numFmt = "dd/mm/yyyy"

    ganttSheet.getCell(ganttRow, 4).value = { formula: `'Project Plan'!C${connectionRow}&"w"` }

    const projectStartSerial = dateToExcelSerial(projectStart)
    for (let week = 0; week < totalWeeks; week++) {
      const cell = ganttSheet.getCell(ganttRow, 5 + week)
      const weekStartSerial = projectStartSerial + week * 7
      const weekEndSerial = projectStartSerial + (week + 1) * 7

      cell.value = {
        formula: `IF(AND(B${ganttRow}<=${weekEndSerial},C${ganttRow}>=${weekStartSerial}),"█","")`,
      }
      cell.font = { color: { argb: "FF4A90E2" }, size: 12 }
      cell.alignment = { horizontal: "center", vertical: "middle" }
    }

    ganttRow++

    // connectionRow + additional setup milestones + blank row = start of deliverables
    let planSheetRow = connectionRow + 1
    if (project.setupMilestones && project.setupMilestones.length > 1) {
      planSheetRow += project.setupMilestones.length - 1 // Additional product implementations
    }
    planSheetRow += 1 // Skip blank row after setup section

    const deliverableColors = [
      "FF10B981", // Green
      "FFEF4444", // Red
      "FFF59E0B", // Orange
      "FF8B5CF6", // Purple
      "FFEC4899", // Pink
      "FF06B6D4", // Cyan
      "FFA855F7", // Purple
    ]

    project.deliverables.forEach((deliverable, deliverableIndex) => {
      const isDatabase =
        "milestones" in deliverable &&
        deliverable.milestones.some((m) => m.name.includes("Get data") || m.name.includes("Build database"))

      // Deliverable header in Gantt
      const deliverableHeaderCell = ganttSheet.getCell(ganttRow, 1)
      const deliverableNumber = deliverableIndex + 1
      let deliverableName = ""

      if (isDatabase) {
        const db = deliverable as CalculatedDatabase
        deliverableName = db.type
      } else {
        const product = deliverable as CalculatedProduct
        deliverableName = product.type === "B&F" ? "Budget and Forecast" : product.type
      }

      deliverableHeaderCell.value = `${deliverableNumber} - ${deliverableName}`
      deliverableHeaderCell.font = { bold: true, size: 11 }
      ganttRow++

      planSheetRow += 3 // +1 for deliverable header, +1 for forecast row, +1 for column headers

      // Add milestones for this deliverable
      deliverable.milestones.forEach((milestone) => {
        ganttSheet.getCell(ganttRow, 1).value = `  ${milestone.name}`

        // Reference dates from Project Plan sheet
        const startCell = ganttSheet.getCell(ganttRow, 2)
        startCell.value = { formula: `'Project Plan'!D${planSheetRow}` }
        startCell.numFmt = "dd/mm/yyyy"

        const endCell = ganttSheet.getCell(ganttRow, 3)
        endCell.value = { formula: `'Project Plan'!E${planSheetRow}` }
        endCell.numFmt = "dd/mm/yyyy"

        ganttSheet.getCell(ganttRow, 4).value = { formula: `'Project Plan'!C${planSheetRow}&"w"` }

        for (let week = 0; week < totalWeeks; week++) {
          const cell = ganttSheet.getCell(ganttRow, 5 + week)
          const weekStartSerial = projectStartSerial + week * 7
          const weekEndSerial = projectStartSerial + (week + 1) * 7

          cell.value = {
            formula: `IF(AND(B${ganttRow}<=${weekEndSerial},C${ganttRow}>=${weekStartSerial}),"█","")`,
          }
          cell.font = { color: { argb: deliverableColors[deliverableIndex % deliverableColors.length] }, size: 12 }
          cell.alignment = { horizontal: "center", vertical: "middle" }
        }

        ganttRow++
        planSheetRow++
      })

      ganttRow++ // Skip empty row between deliverables in Gantt
      planSheetRow++ // Skip empty row between deliverables in Project Plan sheet
    })

    // Add Summary Sheet
    const summarySheet = workbook.addWorksheet("Summary")

    summarySheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 15 },
      { width: 18 },
      { width: 18 },
      { width: 18 }, // Actual End Date
      { width: 18 }, // Actual Duration (weeks)
      { width: 15 }, // Date Variance (days)
      { width: 15 }, // Duration Variance (weeks)
    ]

    let summaryRow = 1

    const summaryTitleCell = summarySheet.getCell(summaryRow, 1)
    summaryTitleCell.value = "Project Summary"
    summaryTitleCell.font = { bold: true, size: 14 }
    summaryRow += 2

    summarySheet.getCell(summaryRow, 1).value = "Project Name:"
    summarySheet.getCell(summaryRow, 2).value = project.projectName
    summaryRow++

    summarySheet.getCell(summaryRow, 1).value = "Start Date:"
    const summaryStartCell = summarySheet.getCell(summaryRow, 2)
    summaryStartCell.value = dateToExcelSerial(new Date(project.projectStartDate))
    summaryStartCell.numFmt = "dd/mm/yyyy"
    summaryRow++

    summarySheet.getCell(summaryRow, 1).value = "Planned End Date:"
    const summaryEndCell = summarySheet.getCell(summaryRow, 2)
    summaryEndCell.value = dateToExcelSerial(new Date(project.projectEndDate))
    summaryEndCell.numFmt = "dd/mm/yyyy"
    summaryRow += 2

    // Deliverables table header (combined databases and products)
    const summaryHeaderRow = summarySheet.getRow(summaryRow)
    const summaryHeaders = [
      "Deliverable",
      "Type",
      "Start Date",
      "Planned End Date",
      "Planned Duration (weeks)",
      "Actual End Date", // Updated Summary headers to match Project Plan terminology
      "Actual Duration (weeks)", // Updated Summary headers to match Project Plan terminology
      "Date Variance (days)",
      "Duration Variance (weeks)",
    ]
    summaryHeaders.forEach((header, index) => {
      const cell = summaryHeaderRow.getCell(index + 1)
      cell.value = header
      cell.fill = headerFill
      cell.font = headerFont
    })
    summaryRow++

    // Row 7: INITIAL SETUP header
    // Row 8: Column headers
    // Row 9: First setup milestone
    let projectPlanRow = 9 // Row 9 is the first setup milestone data row

    // Account for all setup milestones (starting from row 9)
    if (project.setupMilestones && project.setupMilestones.length > 0) {
      projectPlanRow += project.setupMilestones.length // Move past all setup milestones
    }
    projectPlanRow += 1 // Skip blank row after setup section

    // Now projectPlanRow points to where the first deliverable header will be written

    // Process deliverables in order
    project.deliverables.forEach((deliverable, index) => {
      const isDatabase =
        "milestones" in deliverable &&
        deliverable.milestones.some((m) => m.name.includes("Get data") || m.name.includes("Build database"))

      console.log(
        `[v0] Summary deliverable ${index + 1}: projectPlanRow=${projectPlanRow}, milestones=${deliverable.milestones.length}`,
      )

      summarySheet.getCell(summaryRow, 1).value = `${index + 1}`

      if (isDatabase) {
        const db = deliverable as CalculatedDatabase
        summarySheet.getCell(summaryRow, 2).value = db.type

        const dbStartCell = summarySheet.getCell(summaryRow, 3)
        dbStartCell.value = dateToExcelSerial(new Date(db.startDate))
        dbStartCell.numFmt = "dd/mm/yyyy"

        summarySheet.getCell(summaryRow, 4).value = dateToExcelSerial(new Date(db.endDate))
        summarySheet.getCell(summaryRow, 4).numFmt = "dd/mm/yyyy"

        // Row projectPlanRow: Header
        // Row projectPlanRow + 1: Forecast End Date
        // Row projectPlanRow + 2: Column headers
        // Row projectPlanRow + 3: First milestone
        const milestoneStartRow = projectPlanRow + 3
        const milestoneEndRow = milestoneStartRow + db.milestones.length - 1

        console.log(
          `[v0] Database ${db.type}: milestoneStartRow=${milestoneStartRow}, milestoneEndRow=${milestoneEndRow}, formula=SUM('Project Plan'!C${milestoneStartRow}:C${milestoneEndRow})`,
        )

        if (db.type === "Accounts Payable") {
          console.log(
            `[v0] AP Milestone durations:`,
            db.milestones.map((m, i) => `${m.name}=${m.durationWeeks}w`).join(", "),
          )
          console.log(
            `[v0] AP Total weeks calculated:`,
            db.milestones.reduce((sum, m) => sum + m.durationWeeks, 0),
          )
        }

        const plannedDurationCell = summarySheet.getCell(summaryRow, 5)
        plannedDurationCell.value = {
          formula: `SUM('Project Plan'!C${milestoneStartRow}:C${milestoneEndRow})`,
        }
        plannedDurationCell.numFmt = "0"

        const actualEndCell = summarySheet.getCell(summaryRow, 6)
        actualEndCell.value = {
          formula: `IF('Project Plan'!G${milestoneEndRow}="","",'Project Plan'!G${milestoneEndRow})`,
        }
        actualEndCell.numFmt = "dd/mm/yyyy"

        summarySheet.getCell(summaryRow, 7).value = ""

        const dateVarianceCell = summarySheet.getCell(summaryRow, 8)
        dateVarianceCell.value = {
          formula: `IF(F${summaryRow}<>"",IF(D${summaryRow}=F${summaryRow},0,NETWORKDAYS(D${summaryRow},F${summaryRow})),"")`,
        }
        dateVarianceCell.numFmt = "0"

        const durationVarianceCell = summarySheet.getCell(summaryRow, 9)
        durationVarianceCell.value = {
          formula: `IF(G${summaryRow}<>"",G${summaryRow}-E${summaryRow},"")`,
        }
        durationVarianceCell.numFmt = "0"

        console.log(
          `[v0] Incrementing projectPlanRow by ${4 + db.milestones.length + 1} (4 header rows + ${db.milestones.length} milestones + 1 blank)`,
        )
        // 1 header row + 1 forecast row + 1 column headers + milestones + 1 blank = 4 + milestones
        projectPlanRow += 4 + db.milestones.length

        summaryRow++
      } else {
        const product = deliverable as CalculatedProduct
        summarySheet.getCell(summaryRow, 2).value = product.name

        const productStartCell = summarySheet.getCell(summaryRow, 3)
        productStartCell.value = dateToExcelSerial(new Date(product.startDate))
        productStartCell.numFmt = "dd/mm/yyyy"

        summarySheet.getCell(summaryRow, 4).value = dateToExcelSerial(new Date(product.endDate))
        summarySheet.getCell(summaryRow, 4).numFmt = "dd/mm/yyyy"

        const milestoneStartRow = projectPlanRow + 3
        const milestoneEndRow = milestoneStartRow + product.milestones.length - 1

        console.log(
          `[v0] Product ${product.name}: milestoneStartRow=${milestoneStartRow}, milestoneEndRow=${milestoneEndRow}, formula=SUM('Project Plan'!C${milestoneStartRow}:C${milestoneEndRow})`,
        )

        if (product.type === "Accounts Payable") {
          console.log(
            `[v0] AP Milestone durations:`,
            product.milestones.map((m, i) => `${m.name}=${m.durationWeeks}w`).join(", "),
          )
          console.log(
            `[v0] AP Total weeks calculated:`,
            product.milestones.reduce((sum, m) => sum + m.durationWeeks, 0),
          )
        }

        const plannedDurationCell = summarySheet.getCell(summaryRow, 5)
        plannedDurationCell.value = {
          formula: `SUM('Project Plan'!C${milestoneStartRow}:C${milestoneEndRow})`,
        }
        plannedDurationCell.numFmt = "0"

        const actualEndCell = summarySheet.getCell(summaryRow, 6)
        actualEndCell.value = {
          formula: `IF('Project Plan'!G${milestoneEndRow}="","",'Project Plan'!G${milestoneEndRow})`,
        }
        actualEndCell.numFmt = "dd/mm/yyyy"

        summarySheet.getCell(summaryRow, 7).value = ""

        const dateVarianceCell = summarySheet.getCell(summaryRow, 8)
        dateVarianceCell.value = {
          formula: `IF(F${summaryRow}<>"",IF(D${summaryRow}=F${summaryRow},0,NETWORKDAYS(D${summaryRow},F${summaryRow})),"")`,
        }
        dateVarianceCell.numFmt = "0"

        const durationVarianceCell = summarySheet.getCell(summaryRow, 9)
        durationVarianceCell.value = {
          formula: `IF(G${summaryRow}<>"",G${summaryRow}-E${summaryRow},"")`,
        }
        durationVarianceCell.numFmt = "0"

        console.log(
          `[v0] Incrementing projectPlanRow by ${4 + product.milestones.length + 1} (4 header rows + ${product.milestones.length} milestones + 1 blank)`,
        )
        projectPlanRow += 4 + product.milestones.length

        summaryRow++
      }
    })

    console.log("[v0] Generating Excel buffer")
    const buffer = await workbook.xlsx.writeBuffer()
    console.log("[v0] Buffer created, size:", buffer.byteLength)
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    console.log("[v0] Blob created")
    const url = URL.createObjectURL(blob)
    console.log("[v0] Object URL created:", url)
    const link = document.createElement("a")
    link.href = url
    link.download = `${project.projectName}_Project_Plan.xlsx`
    link.click()
    console.log("[v0] Download link clicked")
    URL.revokeObjectURL(url)
    console.log("[v0] Export completed")
  } catch (error) {
    console.error("Failed to export to Excel:", error)
    alert("Failed to generate Excel file. Please try again.")
  }
}
