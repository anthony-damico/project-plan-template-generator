import type {
  ProjectConfig,
  CalculatedProject,
  CalculatedDatabase,
  CalculatedProduct,
  Milestone,
  DatabaseConfig,
  ProductConfig,
  DatabaseType,
  ProductType,
} from "./types"

const MILESTONE_NAMES = {
  CONNECTION: "Provide connection details",
  GET_DATA: "Get data",
  GET_DATA_CUSTOMER: "Get data (Customer)",
  GET_DATA_PARTNER: "Get data (Partner)",
  BUILD_DB: "Build database",
  CREATE_STATEMENTS: "Create statements",
  CUSTOMISATIONS: "Customisations",
  VALIDATION: "Validation",
  TRAINING: "Training",
  TRAINING_FEEDBACK: "Training feedback",
  SIGN_OFF: "Sign-off",
  IMPLEMENT_BF: "Implement Budget and Forecast",
  BF_TRAINING_ROUND_1: "Budget and Forecast - Round 1",
  BF_TRAINING_ROUND_2: "Budget and Forecast - Round 2",
  IMPLEMENT_INSIGHTS: "Implement Insights",
  INSIGHTS_TRAINING_ROUND_1: "Insights - Round 1",
  INSIGHTS_TRAINING_ROUND_2: "Insights - Round 2",
  IMPLEMENT_CRM: "Implement CRM",
  BUILD_CRM_ANALYSIS: "Build CRM Analysis database",
  CRM_CUSTOMISATIONS: "CRM Customisations",
  CRM_ADMIN_TRAINING: "CRM Admin Training",
  CRM_TRAINING: "CRM Training",
  IMPLEMENT_REBATES: "Implement Rebates",
  BUILD_REBATES_ANALYSIS: "Build Rebates Analysis databases",
  REBATES_CUSTOMISATIONS: "Rebates Customisations",
  REBATES_TRAINING: "Rebates Training",
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + weeks * 7)
  return result
}

function getConnectionDuration(config: ProjectConfig): number {
  const hasUnknownERP = config.deliverables.filter((d) => d.deliverableType === "database").some((db) => !db.knowERP)
  return hasUnknownERP ? 2 : 1
}

function getMilestoneDurations(config: DatabaseConfig): Record<string, number> {
  const { knowERP, dataProvider, hasCustomisations, type, hasDataDictionary, hasDataExpert } = config

  const baseDurations = {
    [MILESTONE_NAMES.GET_DATA]: 1,
    [MILESTONE_NAMES.BUILD_DB]: knowERP ? 2 : 2,
    [MILESTONE_NAMES.CREATE_STATEMENTS]: type === "Financial Statements" ? 1 : 0,
    [MILESTONE_NAMES.CUSTOMISATIONS]: 0,
    [MILESTONE_NAMES.VALIDATION]: 2,
    [MILESTONE_NAMES.TRAINING]: 2,
    [MILESTONE_NAMES.TRAINING_FEEDBACK]: 1,
    [MILESTONE_NAMES.SIGN_OFF]: 1,
  }

  if (!knowERP) {
    // Unknown ERP - base durations depend on data provider
    if (dataProvider === "phocas") {
      // Phocas gets data - base durations
      baseDurations[MILESTONE_NAMES.GET_DATA] = 4
      baseDurations[MILESTONE_NAMES.BUILD_DB] = 2
      baseDurations[MILESTONE_NAMES.VALIDATION] = 4

      // Apply reductions based on data dictionary and expert
      if (hasDataDictionary && hasDataExpert) {
        // Both available
        baseDurations[MILESTONE_NAMES.GET_DATA] = 2
        baseDurations[MILESTONE_NAMES.BUILD_DB] = 2 // Keep at minimum 2 weeks
        baseDurations[MILESTONE_NAMES.VALIDATION] = 2
      } else if (hasDataExpert) {
        // Data expert only
        baseDurations[MILESTONE_NAMES.GET_DATA] = 2
        baseDurations[MILESTONE_NAMES.BUILD_DB] = 2 // Keep at minimum 2 weeks
        baseDurations[MILESTONE_NAMES.VALIDATION] = 3
      } else if (hasDataDictionary) {
        // Data dictionary only
        baseDurations[MILESTONE_NAMES.GET_DATA] = 3
        baseDurations[MILESTONE_NAMES.BUILD_DB] = 2
        baseDurations[MILESTONE_NAMES.VALIDATION] = 4
      }
    } else {
      // Customer/Partner provides data - base durations
      baseDurations[MILESTONE_NAMES.GET_DATA] = 8
      baseDurations[MILESTONE_NAMES.BUILD_DB] = 5
      baseDurations[MILESTONE_NAMES.VALIDATION] = 4

      // Apply reductions based on data dictionary and expert
      if (hasDataDictionary && hasDataExpert) {
        // Both available
        baseDurations[MILESTONE_NAMES.GET_DATA] = 6
        baseDurations[MILESTONE_NAMES.BUILD_DB] = 4
        baseDurations[MILESTONE_NAMES.VALIDATION] = 2
      } else if (hasDataExpert) {
        // Data expert only
        baseDurations[MILESTONE_NAMES.GET_DATA] = 6
        baseDurations[MILESTONE_NAMES.BUILD_DB] = 4
        baseDurations[MILESTONE_NAMES.VALIDATION] = 3
      } else if (hasDataDictionary) {
        // Data dictionary only
        baseDurations[MILESTONE_NAMES.GET_DATA] = 8
        baseDurations[MILESTONE_NAMES.BUILD_DB] = 5
        baseDurations[MILESTONE_NAMES.VALIDATION] = 4
      }
    }
  } else {
    // Known ERP scenarios
    if (dataProvider === "customer" || dataProvider === "partner") {
      baseDurations[MILESTONE_NAMES.GET_DATA] = 4
      baseDurations[MILESTONE_NAMES.BUILD_DB] = 2
      baseDurations[MILESTONE_NAMES.VALIDATION] = 2
    } else {
      // Phocas gets data
      baseDurations[MILESTONE_NAMES.GET_DATA] = 1
      baseDurations[MILESTONE_NAMES.BUILD_DB] = 2
      baseDurations[MILESTONE_NAMES.VALIDATION] = 2
    }
  }

  // Apply customisation adjustments (applies to all scenarios)
  if (hasCustomisations) {
    baseDurations[MILESTONE_NAMES.GET_DATA] += 1
    baseDurations[MILESTONE_NAMES.CUSTOMISATIONS] = 2
  }

  // Bespoke databases get additional time
  if (type === "Bespoke") {
    baseDurations[MILESTONE_NAMES.GET_DATA] += 1
    baseDurations[MILESTONE_NAMES.BUILD_DB] += 2
    baseDurations[MILESTONE_NAMES.VALIDATION] += 1
  }

  return baseDurations
}

function calculateDatabaseTimeline(config: DatabaseConfig, startDate: Date): CalculatedDatabase {
  const durations = getMilestoneDurations(config)
  const milestones: Milestone[] = []
  let currentDate = new Date(startDate)

  let getDataMilestoneName = MILESTONE_NAMES.GET_DATA
  if (config.dataProvider === "customer") {
    getDataMilestoneName = MILESTONE_NAMES.GET_DATA_CUSTOMER
  } else if (config.dataProvider === "partner") {
    getDataMilestoneName = MILESTONE_NAMES.GET_DATA_PARTNER
  }

  const milestoneOrder = [
    getDataMilestoneName,
    MILESTONE_NAMES.BUILD_DB,
    ...(config.type === "Financial Statements" ? [MILESTONE_NAMES.CREATE_STATEMENTS] : []),
    ...(config.hasCustomisations ? [MILESTONE_NAMES.CUSTOMISATIONS] : []),
    MILESTONE_NAMES.VALIDATION,
    MILESTONE_NAMES.TRAINING,
    ...(config.hasTrainingFeedback ? [MILESTONE_NAMES.TRAINING_FEEDBACK] : []),
    MILESTONE_NAMES.SIGN_OFF,
  ]

  for (const milestoneName of milestoneOrder) {
    const duration = durations[milestoneName] || durations[MILESTONE_NAMES.GET_DATA]

    if (duration > 0) {
      const endDate = addWeeks(currentDate, duration)
      milestones.push({
        name: milestoneName,
        plannedStartDate: new Date(currentDate),
        plannedEndDate: new Date(endDate),
        durationWeeks: duration,
        status: "Not started",
      })
      currentDate = endDate
    }
  }

  const totalDuration = Object.values(durations).reduce((sum, d) => sum + d, 0)

  return {
    id: config.id,
    type: config.type,
    startDate: new Date(startDate),
    endDate: new Date(currentDate),
    milestones,
    totalDurationWeeks: totalDuration,
  }
}

function calculateProductTimeline(config: ProductConfig, startDate: Date): CalculatedProduct {
  const milestones: Milestone[] = []
  let currentDate = new Date(startDate)

  const productNames: Record<ProductType, string> = {
    "B&F": "Budget and Forecast",
    CRM: "CRM",
    Insights: "Insights",
    Rebates: "Rebates",
  }

  if (config.type === "B&F") {
    // Default training rounds (Round 1 and Round 2) - 1 week each
    for (let i = 1; i <= 2; i++) {
      const trainingEndDate = addWeeks(currentDate, 1)
      milestones.push({
        name: `Budget and Forecast - Round ${i}`,
        plannedStartDate: new Date(currentDate),
        plannedEndDate: new Date(trainingEndDate),
        durationWeeks: 1,
        status: "Not started",
      })
      currentDate = trainingEndDate
    }

    // Additional training sessions
    for (let i = 3; i <= 2 + config.additionalTrainingSessions; i++) {
      const trainingEndDate = addWeeks(currentDate, 1)
      milestones.push({
        name: `Budget and Forecast - Round ${i}`,
        plannedStartDate: new Date(currentDate),
        plannedEndDate: new Date(trainingEndDate),
        durationWeeks: 1,
        status: "Not started",
      })
      currentDate = trainingEndDate
    }
  } else if (config.type === "Insights") {
    // Default training round (Round 1 only) - 1 week
    const trainingEndDate = addWeeks(currentDate, 1)
    milestones.push({
      name: `Insights - Round 1`,
      plannedStartDate: new Date(currentDate),
      plannedEndDate: new Date(trainingEndDate),
      durationWeeks: 1,
      status: "Not started",
    })
    currentDate = trainingEndDate

    // Additional training sessions
    for (let i = 2; i <= 1 + config.additionalTrainingSessions; i++) {
      const trainingEndDate = addWeeks(currentDate, 1)
      milestones.push({
        name: `Insights - Round ${i}`,
        plannedStartDate: new Date(currentDate),
        plannedEndDate: new Date(trainingEndDate),
        durationWeeks: 1,
        status: "Not started",
      })
      currentDate = trainingEndDate
    }
  } else if (config.type === "CRM") {
    // CRM structure: Build CRM Analysis (1w) -> Optional Customisations -> Admin Training (1w) -> Training (1w) + additional

    // Build CRM Analysis database - 1 week
    const buildEndDate = addWeeks(currentDate, 1)
    milestones.push({
      name: MILESTONE_NAMES.BUILD_CRM_ANALYSIS,
      plannedStartDate: new Date(currentDate),
      plannedEndDate: new Date(buildEndDate),
      durationWeeks: 1,
      status: "Not started",
    })
    currentDate = buildEndDate

    // Optional Customisations
    if (config.crmCustomisationLevel && config.crmCustomisationLevel !== "none") {
      const customisationDurations = {
        low: 1,
        medium: 2,
        high: 4,
        none: 0,
      }
      const customisationDuration = customisationDurations[config.crmCustomisationLevel]
      const customisationEndDate = addWeeks(currentDate, customisationDuration)
      milestones.push({
        name: `${MILESTONE_NAMES.CRM_CUSTOMISATIONS} (${config.crmCustomisationLevel})`,
        plannedStartDate: new Date(currentDate),
        plannedEndDate: new Date(customisationEndDate),
        durationWeeks: customisationDuration,
        status: "Not started",
      })
      currentDate = customisationEndDate
    }

    // Admin Training - 1 week
    const adminTrainingEndDate = addWeeks(currentDate, 1)
    milestones.push({
      name: MILESTONE_NAMES.CRM_ADMIN_TRAINING,
      plannedStartDate: new Date(currentDate),
      plannedEndDate: new Date(adminTrainingEndDate),
      durationWeeks: 1,
      status: "Not started",
    })
    currentDate = adminTrainingEndDate

    // Training - default 1 round (1 week)
    const trainingEndDate = addWeeks(currentDate, 1)
    milestones.push({
      name: `${MILESTONE_NAMES.CRM_TRAINING} - Round 1`,
      plannedStartDate: new Date(currentDate),
      plannedEndDate: new Date(trainingEndDate),
      durationWeeks: 1,
      status: "Not started",
    })
    currentDate = trainingEndDate

    // Additional training sessions
    for (let i = 2; i <= 1 + config.additionalTrainingSessions; i++) {
      const additionalTrainingEndDate = addWeeks(currentDate, 1)
      milestones.push({
        name: `${MILESTONE_NAMES.CRM_TRAINING} - Round ${i}`,
        plannedStartDate: new Date(currentDate),
        plannedEndDate: new Date(additionalTrainingEndDate),
        durationWeeks: 1,
        status: "Not started",
      })
      currentDate = additionalTrainingEndDate
    }
  } else if (config.type === "Rebates") {
    // Rebates structure: Build Rebates Analysis (1w) -> Optional Customisations -> Training (1w) + additional

    // Build Rebates Analysis databases - 1 week
    const buildEndDate = addWeeks(currentDate, 1)
    milestones.push({
      name: MILESTONE_NAMES.BUILD_REBATES_ANALYSIS,
      plannedStartDate: new Date(currentDate),
      plannedEndDate: new Date(buildEndDate),
      durationWeeks: 1,
      status: "Not started",
    })
    currentDate = buildEndDate

    // Optional Customisations
    if (config.rebatesCustomisationLevel && config.rebatesCustomisationLevel !== "none") {
      const customisationDurations = {
        low: 1,
        medium: 2,
        high: 4,
        none: 0,
      }
      const customisationDuration = customisationDurations[config.rebatesCustomisationLevel]
      const customisationEndDate = addWeeks(currentDate, customisationDuration)
      milestones.push({
        name: `${MILESTONE_NAMES.REBATES_CUSTOMISATIONS} (${config.rebatesCustomisationLevel})`,
        plannedStartDate: new Date(currentDate),
        plannedEndDate: new Date(customisationEndDate),
        durationWeeks: customisationDuration,
        status: "Not started",
      })
      currentDate = customisationEndDate
    }

    // Training - default 1 round (1 week)
    const trainingEndDate = addWeeks(currentDate, 1)
    milestones.push({
      name: `${MILESTONE_NAMES.REBATES_TRAINING} - Round 1`,
      plannedStartDate: new Date(currentDate),
      plannedEndDate: new Date(trainingEndDate),
      durationWeeks: 1,
      status: "Not started",
    })
    currentDate = trainingEndDate

    // Additional training sessions
    for (let i = 2; i <= 1 + config.additionalTrainingSessions; i++) {
      const additionalTrainingEndDate = addWeeks(currentDate, 1)
      milestones.push({
        name: `${MILESTONE_NAMES.REBATES_TRAINING} - Round ${i}`,
        plannedStartDate: new Date(currentDate),
        plannedEndDate: new Date(additionalTrainingEndDate),
        durationWeeks: 1,
        status: "Not started",
      })
      currentDate = additionalTrainingEndDate
    }
  }

  const totalDuration = milestones.reduce((sum, m) => sum + m.durationWeeks, 0)

  return {
    id: config.id,
    type: config.type,
    name: productNames[config.type],
    startDate: new Date(startDate),
    endDate: new Date(currentDate),
    milestones,
    totalDurationWeeks: totalDuration,
  }
}

function calculateProductImplementation(config: ProductConfig, startDate: Date): Milestone[] {
  const milestones: Milestone[] = []

  if (config.type === "B&F") {
    // Implement B&F milestone - 1 week duration, runs concurrent with connection
    const implementEndDate = addWeeks(startDate, 1)
    milestones.push({
      name: MILESTONE_NAMES.IMPLEMENT_BF,
      plannedStartDate: new Date(startDate),
      plannedEndDate: new Date(implementEndDate),
      durationWeeks: 1,
      isProjectLevel: true, // Mark as project-level so it appears in Setup section
      status: "Not started",
    })
  } else if (config.type === "Insights") {
    // Implement Insights milestone - 1 week duration, runs concurrent with connection
    const implementEndDate = addWeeks(startDate, 1)
    milestones.push({
      name: MILESTONE_NAMES.IMPLEMENT_INSIGHTS,
      plannedStartDate: new Date(startDate),
      plannedEndDate: new Date(implementEndDate),
      durationWeeks: 1,
      isProjectLevel: true, // Mark as project-level so it appears in Setup section
      status: "Not started",
    })
  } else if (config.type === "CRM") {
    // Implement CRM milestone - 1 week duration, runs concurrent with connection
    const implementEndDate = addWeeks(startDate, 1)
    milestones.push({
      name: MILESTONE_NAMES.IMPLEMENT_CRM,
      plannedStartDate: new Date(startDate),
      plannedEndDate: new Date(implementEndDate),
      durationWeeks: 1,
      isProjectLevel: true, // Mark as project-level so it appears in Setup section
      status: "Not started",
    })
  } else if (config.type === "Rebates") {
    // Implement Rebates milestone - 1 week duration, runs concurrent with connection
    const implementEndDate = addWeeks(startDate, 1)
    milestones.push({
      name: MILESTONE_NAMES.IMPLEMENT_REBATES,
      plannedStartDate: new Date(startDate),
      plannedEndDate: new Date(implementEndDate),
      durationWeeks: 1,
      isProjectLevel: true, // Mark as project-level so it appears in Setup section
      status: "Not started",
    })
  }

  return milestones
}

export function calculateProject(config: ProjectConfig): CalculatedProject {
  console.log("[v0] calculateProject called with config:", config)

  const connectionDuration = getConnectionDuration(config)
  const connectionStartDate = new Date(config.projectStartDate)
  const connectionEndDate = addWeeks(connectionStartDate, connectionDuration)

  const connectionMilestone: Milestone = {
    name: MILESTONE_NAMES.CONNECTION,
    plannedStartDate: connectionStartDate,
    plannedEndDate: connectionEndDate,
    durationWeeks: connectionDuration,
    isProjectLevel: true,
    status: "Not started",
  }

  const setupMilestones: Milestone[] = [connectionMilestone]

  // Process products to extract implementation milestones
  const productConfigs: ProductConfig[] = []
  for (const deliverable of config.deliverables) {
    if (deliverable.deliverableType === "product") {
      const productConfig: ProductConfig = {
        id: deliverable.id,
        type: deliverable.type as ProductType,
        additionalTrainingSessions: deliverable.additionalTrainingSessions ?? 0,
        crmCustomisationLevel: deliverable.crmCustomisationLevel,
        rebatesCustomisationLevel: deliverable.rebatesCustomisationLevel,
      }
      productConfigs.push(productConfig)

      // Add implementation milestone to setup section
      const implementMilestones = calculateProductImplementation(productConfig, connectionStartDate)
      setupMilestones.push(...implementMilestones)
    }
  }

  const databases: CalculatedDatabase[] = []
  const products: CalculatedProduct[] = []
  const deliverables: Array<CalculatedDatabase | CalculatedProduct> = []
  let currentDate = new Date(connectionEndDate)

  for (const deliverable of config.deliverables) {
    console.log("[v0] Processing deliverable:", deliverable)

    if (deliverable.deliverableType === "database") {
      const databaseConfig: DatabaseConfig = {
        id: deliverable.id,
        type: deliverable.type as DatabaseType,
        knowERP: deliverable.knowERP ?? true,
        dataProvider: deliverable.dataProvider ?? "us",
        hasCustomisations: deliverable.hasCustomisations ?? false,
        hasTrainingFeedback: deliverable.hasTrainingFeedback ?? true,
        hasDataDictionary: deliverable.hasDataDictionary ?? false,
        hasDataExpert: deliverable.hasDataExpert ?? false,
        customStartDate: deliverable.customStartDate,
      }

      const dbStartDate = deliverable.customStartDate || currentDate
      const calculatedDb = calculateDatabaseTimeline(databaseConfig, dbStartDate)
      console.log("[v0] Calculated database:", calculatedDb)
      databases.push(calculatedDb)
      deliverables.push(calculatedDb)

      if (config.executionMode === "sequential") {
        currentDate = calculatedDb.endDate
      }
    } else if (deliverable.deliverableType === "product") {
      // Find the matching product config
      const productConfig = productConfigs.find((p) => p.id === deliverable.id)
      if (productConfig) {
        const calculatedProduct = calculateProductTimeline(productConfig, currentDate)
        console.log("[v0] Calculated product training:", calculatedProduct)
        products.push(calculatedProduct)
        deliverables.push(calculatedProduct)

        if (config.executionMode === "sequential") {
          currentDate = calculatedProduct.endDate
        }
      }
    }
  }

  const allEndDates = [
    ...setupMilestones.map((m) => m.plannedEndDate.getTime()),
    ...databases.map((db) => db.endDate.getTime()),
    ...products.map((p) => p.endDate.getTime()),
  ]
  const projectEndDate = new Date(Math.max(...allEndDates))

  console.log("[v0] Final calculated project:", { setupMilestones, databases, products, deliverables })

  return {
    projectName: config.projectName,
    projectStartDate: config.projectStartDate,
    executionMode: config.executionMode,
    connectionMilestone,
    setupMilestones,
    databases,
    products,
    deliverables, // Added ordered deliverables array
    projectEndDate,
  }
}
