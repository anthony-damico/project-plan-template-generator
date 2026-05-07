import type { ConsolidatedProjectConfig } from "./types"

// Consolidated project milestones based on the template
const CONSOLIDATED_MILESTONES = {
  FS: [
    "Provide Connection Details",
    "Get data",
    "Provide Validation Reports (P&L, BS, Trial Balance)",
    "Build Database",
    "Create Elimination Process",
    "Setup Financial Statements using Chart of Accounts",
    "Validation (P&L, BS, Trial Balance)",
    "Consolidate",
    "Consolidation Validation",
    "Database Signoff",
  ],
  AR: [
    "Get data",
    "Provide Validation Reports",
    "Build Database",
    "Validation",
    "Consolidate",
    "Consolidation Validation",
    "Database Signoff",
  ],
  DEFAULT: [
    "Provide Connection Details",
    "Get data",
    "Build Database",
    "Validation",
    "Consolidate",
    "Consolidation Validation",
    "Database Signoff",
  ],
}

function getMilestonesForDatabase(dbType: string): string[] {
  if (dbType === "Financial Statements") {
    return CONSOLIDATED_MILESTONES.FS
  } else if (dbType === "Accounts Receivable") {
    return CONSOLIDATED_MILESTONES.AR
  }
  return CONSOLIDATED_MILESTONES.DEFAULT
}

export async function exportConsolidatedProject(config: ConsolidatedProjectConfig) {
  console.log("[v0] exportConsolidatedProject started")

  try {
    const ExcelJSModule = await import("exceljs")
    const ExcelJS = ExcelJSModule.default

    const workbook = new ExcelJS.Workbook()
    console.log("[v0] Workbook created")

    // Create Responsibility Matrix sheet
    const matrixSheet = workbook.addWorksheet("Responsibility Matrix")
    console.log("[v0] Matrix worksheet created")

    let currentRow = 1

    const headerRow = matrixSheet.getRow(currentRow)
    headerRow.getCell(1).value = "Data source:"
    headerRow.getCell(2).value = "Provide connection to the data source:"
    headerRow.getCell(3).value = "Data expert:"
    headerRow.getCell(4).value = "Data Dictionary (optional):"

    for (let col = 1; col <= 4; col++) {
      const cell = headerRow.getCell(col)
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      }
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      }
    }
    currentRow++

    // Data source rows
    config.erps.forEach((erp) => {
      const row = matrixSheet.getRow(currentRow)
      row.getCell(1).value = erp.name
      row.getCell(2).value = erp.connectionProvider
      row.getCell(3).value = erp.dataExpert
      row.getCell(4).value = erp.dataDictionary ? "Yes" : "No"

      for (let col = 1; col <= 4; col++) {
        row.getCell(col).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      }
      currentRow++
    })

    currentRow++

    config.databases.forEach((db) => {
      const isFinancialStatements = db.type === "Financial Statements"
      const numColumns = isFinancialStatements ? 4 : 3

      const dbHeaderRow = matrixSheet.getRow(currentRow)
      dbHeaderRow.getCell(1).value = `${db.type}:`
      dbHeaderRow.getCell(2).value = "Validation report provider"

      if (isFinancialStatements) {
        dbHeaderRow.getCell(3).value = "Provide Chart of accounts"
        dbHeaderRow.getCell(4).value = "Contact to validate and map statements:"
      } else {
        dbHeaderRow.getCell(3).value = "Contact to validate:"
      }

      for (let col = 1; col <= numColumns; col++) {
        const cell = dbHeaderRow.getCell(col)
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        }
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      }
      currentRow++

      const dbErps = config.erps.filter((erp) => db.erpIds.includes(erp.id))
      dbErps.forEach((erp) => {
        const row = matrixSheet.getRow(currentRow)
        row.getCell(1).value = erp.name
        row.getCell(2).value = db.validationReportProvider

        if (isFinancialStatements) {
          row.getCell(3).value = db.chartOfAccountsProvider
          row.getCell(4).value = db.validationContact
        } else {
          row.getCell(3).value = db.validationContact
        }

        for (let col = 1; col <= numColumns; col++) {
          row.getCell(col).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          }
        }
        currentRow++
      })

      const ownerRow = matrixSheet.getRow(currentRow)
      ownerRow.getCell(1).value = "Consolidation owner:"
      ownerRow.getCell(2).value = db.validationReportConsolidationOwner

      if (isFinancialStatements) {
        ownerRow.getCell(3).value = db.chartOfAccountsConsolidationOwner
        ownerRow.getCell(4).value = db.validationConsolidationOwner
      } else {
        ownerRow.getCell(3).value = db.validationConsolidationOwner
      }

      for (let col = 1; col <= numColumns; col++) {
        const cell = ownerRow.getCell(col)
        cell.font = { bold: true }
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      }
      currentRow++

      currentRow++
    })

    matrixSheet.columns.forEach((column) => {
      let maxLength = 0
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellValue = cell.value?.toString() || ""
        maxLength = Math.max(maxLength, cellValue.length)
      })
      column.width = Math.min(Math.max(maxLength + 2, 10), 50)
    })

    // Create Update Template sheet
    const templateSheet = workbook.addWorksheet("Project Completion")
    console.log("[v0] Template worksheet created")

    const columnCount = 1 + config.erps.length
    const columns: Partial<ExcelJS.Column>[] = [{ width: 40 }]
    config.erps.forEach(() => columns.push({ width: 20 }))
    templateSheet.columns = columns

    let templateRow = 1

    const projectCompletionRow = templateSheet.getRow(templateRow)
    projectCompletionRow.getCell(1).value = "Project Completion %"

    const dbStartRows: number[] = []

    projectCompletionRow.getCell(2).value = { formula: "0" }

    projectCompletionRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
    projectCompletionRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    }
    projectCompletionRow.getCell(2).font = { bold: true, color: { argb: "FFFFFFFF" } }
    projectCompletionRow.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    }

    templateRow += 2

    config.databases.forEach((db, dbIndex) => {
      const dbErps = config.erps.filter((erp) => db.erpIds.includes(erp.id))
      const milestones = getMilestonesForDatabase(db.type)

      const dbHeaderRow = templateSheet.getRow(templateRow)
      const dbStartRow = templateRow + 1
      dbStartRows.push(dbStartRow)

      dbHeaderRow.getCell(1).value = `${db.type} Consolidated:`
      dbHeaderRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
      dbHeaderRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      }

      dbErps.forEach((erp, index) => {
        dbHeaderRow.getCell(2 + index).value = erp.name
        dbHeaderRow.getCell(2 + index).font = { bold: true, color: { argb: "FFFFFFFF" } }
        dbHeaderRow.getCell(2 + index).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        }
      })
      templateRow++

      milestones.forEach((milestone, milestoneIndex) => {
        const row = templateSheet.getRow(templateRow)
        const rowNumber = templateRow
        row.getCell(1).value = milestone

        dbErps.forEach((_, index) => {
          const cell = row.getCell(2 + index)
          cell.value = ""

          cell.dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: ['"In Progress,On Hold,Completed,Cancelled"'],
          }
        })

        dbErps.forEach((_, index) => {
          const colLetter = String.fromCharCode(66 + index)
          templateSheet.addConditionalFormatting({
            ref: `${colLetter}${rowNumber}`,
            rules: [
              {
                type: "containsText",
                operator: "containsText",
                text: "In Progress",
                style: {
                  fill: {
                    type: "pattern",
                    pattern: "solid",
                    bgColor: { argb: "FFFFFF00" },
                  },
                },
              },
            ],
          })
        })

        const numErps = dbErps.length
        const startColLetter = "B"
        const endColLetter = String.fromCharCode(66 + numErps - 1)

        // Formula to check if all cells in the row are "Completed"
        const allCompletedFormula = `COUNTIF($${startColLetter}${rowNumber}:$${endColLetter}${rowNumber},"Completed")=${numErps}`

        // Apply strikethrough to the entire row when all are completed
        for (let col = 1; col <= numErps + 1; col++) {
          const colLetter = String.fromCharCode(64 + col)
          templateSheet.addConditionalFormatting({
            ref: `${colLetter}${rowNumber}`,
            rules: [
              {
                type: "expression",
                formulae: [allCompletedFormula],
                style: {
                  font: {
                    strike: true,
                  },
                },
              },
            ],
          })
        }

        templateRow++
      })

      const dbCompletionRow = templateSheet.getRow(templateRow)
      dbCompletionRow.getCell(1).value = `${db.type} % Complete:`
      dbCompletionRow.font = { bold: true }

      const dbEndRow = templateRow - 1
      const numErps = dbErps.length
      const startCol = 2
      const endCol = 1 + numErps

      const rangeStart = templateSheet.getCell(dbStartRow, startCol).address
      const rangeEnd = templateSheet.getCell(dbEndRow, endCol).address
      dbCompletionRow.getCell(2).value = {
        formula: `IF(COUNTA(${rangeStart}:${rangeEnd})=0,0,COUNTIF(${rangeStart}:${rangeEnd},"Completed")/COUNTA(${rangeStart}:${rangeEnd}))`,
      }
      dbCompletionRow.getCell(2).numFmt = "0%"

      templateRow += 2
    })

    const allRanges: string[] = []
    config.databases.forEach((db, dbIndex) => {
      const dbErps = config.erps.filter((erp) => db.erpIds.includes(erp.id))
      const milestones = getMilestonesForDatabase(db.type)
      const dbStartRow = dbStartRows[dbIndex]
      const dbEndRow = dbStartRow + milestones.length - 1
      const numErps = dbErps.length
      const startCol = 2
      const endCol = 1 + numErps

      const rangeStart = templateSheet.getCell(dbStartRow, startCol).address
      const rangeEnd = templateSheet.getCell(dbEndRow, endCol).address
      allRanges.push(`${rangeStart}:${rangeEnd}`)
    })

    const completedFormula = allRanges.map((range) => `COUNTIF(${range},"Completed")`).join("+")
    const totalFormula = allRanges.map((range) => `COUNTA(${range})`).join("+")
    projectCompletionRow.getCell(2).value = {
      formula: `IF(${totalFormula}=0,0,(${completedFormula})/(${totalFormula}))`,
    }
    projectCompletionRow.getCell(2).numFmt = "0%"

    templateSheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      })
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
    link.download = `${config.projectName}_Consolidated_Project.xlsx`
    link.click()
    console.log("[v0] Download link clicked")
    URL.revokeObjectURL(url)
    console.log("[v0] Export completed")
  } catch (error) {
    console.error("Failed to load ExcelJS:", error)
    alert("Failed to generate Excel file. Please try again.")
  }
}

export async function exportConsolidatedResponsibilityMatrix(config: ConsolidatedProjectConfig) {
  console.log("[v0] exportConsolidatedResponsibilityMatrix started")

  try {
    const ExcelJSModule = await import("exceljs")
    const ExcelJS = ExcelJSModule.default

    const workbook = new ExcelJS.Workbook()
    console.log("[v0] Workbook created")
    const worksheet = workbook.addWorksheet("Responsibility Matrix")
    console.log("[v0] Worksheet created")

    let currentRow = 1

    const headerRow = worksheet.getRow(currentRow)
    headerRow.getCell(1).value = "Data source:"
    headerRow.getCell(2).value = "Provide connection to the data source:"
    headerRow.getCell(3).value = "Data expert:"
    headerRow.getCell(4).value = "Data Dictionary (optional):"

    for (let col = 1; col <= 4; col++) {
      const cell = headerRow.getCell(col)
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      }
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      }
    }
    currentRow++

    // Data source rows
    config.erps.forEach((erp) => {
      const row = worksheet.getRow(currentRow)
      row.getCell(1).value = erp.name
      row.getCell(2).value = erp.connectionProvider
      row.getCell(3).value = erp.dataExpert
      row.getCell(4).value = erp.dataDictionary ? "Yes" : "No" // Display Yes/No instead of text value

      // Add borders to data cells
      for (let col = 1; col <= 4; col++) {
        row.getCell(col).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      }
      currentRow++
    })

    // Add spacing
    currentRow++

    // Database sections
    config.databases.forEach((db) => {
      const isFinancialStatements = db.type === "Financial Statements"
      const numColumns = isFinancialStatements ? 4 : 3

      const dbHeaderRow = worksheet.getRow(currentRow)
      dbHeaderRow.getCell(1).value = `${db.type}:`
      dbHeaderRow.getCell(2).value = "Validation report provider"

      if (isFinancialStatements) {
        dbHeaderRow.getCell(3).value = "Provide Chart of accounts"
        dbHeaderRow.getCell(4).value = "Contact to validate and map statements:"
      } else {
        dbHeaderRow.getCell(3).value = "Contact to validate:"
      }

      for (let col = 1; col <= numColumns; col++) {
        const cell = dbHeaderRow.getCell(col)
        cell.font = { bold: true }
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" }, // Light blue
        }
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      }
      currentRow++

      // Get ERPs for this database
      const dbErps = config.erps.filter((erp) => db.erpIds.includes(erp.id))
      dbErps.forEach((erp) => {
        const row = worksheet.getRow(currentRow)
        row.getCell(1).value = erp.name
        row.getCell(2).value = db.validationReportProvider

        if (isFinancialStatements) {
          row.getCell(3).value = db.chartOfAccountsProvider
          row.getCell(4).value = db.validationContact
        } else {
          row.getCell(3).value = db.validationContact
        }

        // Add borders to data cells
        for (let col = 1; col <= numColumns; col++) {
          row.getCell(col).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          }
        }
        currentRow++
      })

      const ownerRow = worksheet.getRow(currentRow)
      ownerRow.getCell(1).value = "Consolidation owner:"
      ownerRow.getCell(2).value = db.consolidationOwner

      // Apply styling to first cell before merge
      ownerRow.getCell(1).font = { bold: true }
      ownerRow.getCell(1).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      }

      // Apply styling to all cells in the merge range before merging
      for (let col = 2; col <= numColumns; col++) {
        const cell = ownerRow.getCell(col)
        cell.font = { bold: true }
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      }

      // Merge cells from column 2 to the last column
      worksheet.mergeCells(currentRow, 2, currentRow, numColumns)

      currentRow++

      currentRow++
    })

    worksheet.columns.forEach((column) => {
      let maxLength = 0
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellValue = cell.value?.toString() || ""
        maxLength = Math.max(maxLength, cellValue.length)
      })
      column.width = Math.min(Math.max(maxLength + 2, 10), 50)
    })

    // Generate and download
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
    link.download = `${config.projectName}_Responsibility_Matrix.xlsx`
    link.click()
    console.log("[v0] Download link clicked")
    URL.revokeObjectURL(url)
    console.log("[v0] Export completed")
  } catch (error) {
    console.error("Failed to load ExcelJS:", error)
    alert("Failed to generate Excel file. Please try again.")
  }
}

export async function exportConsolidatedUpdateTemplate(config: ConsolidatedProjectConfig) {
  console.log("[v0] exportConsolidatedUpdateTemplate started")

  try {
    const ExcelJSModule = await import("exceljs")
    const ExcelJS = ExcelJSModule.default

    const workbook = new ExcelJS.Workbook()
    console.log("[v0] Workbook created")
    const worksheet = workbook.addWorksheet("Project Update")
    console.log("[v0] Worksheet created")

    // Calculate column count: 1 for milestone names + number of ERPs
    const columnCount = 1 + config.erps.length
    const columns: Partial<ExcelJS.Column>[] = [{ width: 40 }] // Milestone column
    config.erps.forEach(() => columns.push({ width: 20 })) // ERP columns
    worksheet.columns = columns

    let currentRow = 1

    // Project completion header
    const completionRow = worksheet.getRow(currentRow)
    completionRow.getCell(1).value = "Project Completion %"
    completionRow.getCell(2).value = "0%"
    completionRow.font = { bold: true }
    completionRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    }
    completionRow.getCell(1).font = { ...completionRow.getCell(1).font, color: { argb: "FFFFFFFF" } }
    currentRow += 2

    // For each database, create a section
    config.databases.forEach((db, dbIndex) => {
      const dbErps = config.erps.filter((erp) => db.erpIds.includes(erp.id))
      const milestones = getMilestonesForDatabase(db.type)

      // Database header row
      const dbHeaderRow = worksheet.getRow(currentRow)
      dbHeaderRow.getCell(1).value = `${db.type} Consolidated:`
      dbHeaderRow.font = { bold: true }
      dbHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      }
      dbHeaderRow.getCell(1).font = { ...dbHeaderRow.getCell(1).font, color: { argb: "FFFFFFFF" } }

      // ERP names in header
      dbErps.forEach((erp, index) => {
        dbHeaderRow.getCell(2 + index).value = erp.name
        dbHeaderRow.getCell(2 + index).font = { bold: true }
        dbHeaderRow.getCell(2 + index).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        }
        dbHeaderRow.getCell(2 + index).font = {
          ...dbHeaderRow.getCell(2 + index).font,
          color: { argb: "FFFFFFFF" },
        }
      })
      currentRow++

      // Milestone rows
      milestones.forEach((milestone) => {
        const row = worksheet.getRow(currentRow)
        row.getCell(1).value = milestone
        dbErps.forEach((_, index) => {
          row.getCell(2 + index).value = "In Progress"
        })
        currentRow++
      })

      // Completion row
      const completionRow = worksheet.getRow(currentRow)
      completionRow.getCell(1).value = `${db.type} % Complete:`
      completionRow.getCell(2).value = "0%"
      completionRow.font = { bold: true }
      currentRow += 2
    })

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      })
    })

    // Generate and download
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
    link.download = `${config.projectName}_Update_Template.xlsx`
    link.click()
    console.log("[v0] Download link clicked")
    URL.revokeObjectURL(url)
    console.log("[v0] Export completed")
  } catch (error) {
    console.error("Failed to load ExcelJS:", error)
    alert("Failed to generate Excel file. Please try again.")
  }
}
