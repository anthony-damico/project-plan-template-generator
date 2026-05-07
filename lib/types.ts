export type DatabaseType =
  | "Sales"
  | "Purchasing, Sales and Stock"
  | "Financial Statements"
  | "Accounts Receivable"
  | "Accounts Payable"
  | "Inventory"
  | "Bespoke"

export type DataProvider = "us" | "customer" | "partner"

export type MilestoneStatus = "Not started" | "In progress" | "Complete" | "On Hold"

export type DeliverableType = "database" | "product"

export interface DeliverableConfig {
  id: string
  deliverableType: DeliverableType
  type: DatabaseType | ProductType
  // Database-specific fields (only used when deliverableType === "database")
  knowERP?: boolean
  dataProvider?: DataProvider
  hasCustomisations?: boolean
  hasTrainingFeedback?: boolean
  hasDataDictionary?: boolean
  hasDataExpert?: boolean
  customStartDate?: Date
  // Product-specific fields (only used when deliverableType === "product")
  additionalTrainingSessions?: number
  crmCustomisationLevel?: "none" | "low" | "medium" | "high" // CRM customisation level
  rebatesCustomisationLevel?: "none" | "low" | "medium" | "high" // Rebates customisation level
}

export interface DatabaseConfig {
  id: string
  type: DatabaseType
  knowERP: boolean
  dataProvider: DataProvider
  hasCustomisations: boolean
  hasTrainingFeedback: boolean
  hasDataDictionary: boolean
  hasDataExpert: boolean
  customStartDate?: Date
}

export interface ProjectConfig {
  projectName: string
  projectStartDate: Date
  executionMode: "sequential" | "parallel"
  deliverables: DeliverableConfig[] // Replaced databases and products with unified deliverables array
}

export interface Milestone {
  name: string
  plannedStartDate: Date
  plannedEndDate: Date
  durationWeeks: number
  isProjectLevel?: boolean
  status: MilestoneStatus
  actualStartDate?: Date
  actualEndDate?: Date
}

export interface CalculatedDatabase {
  id: string
  type: DatabaseType
  startDate: Date
  endDate: Date
  milestones: Milestone[]
  totalDurationWeeks: number
}

export interface CalculatedProduct {
  id: string
  type: ProductType
  name: string // Added name property for display in UI
  startDate: Date
  endDate: Date
  milestones: Milestone[]
  totalDurationWeeks: number
}

export interface CalculatedProject {
  projectName: string
  projectStartDate: Date
  executionMode: "sequential" | "parallel"
  connectionMilestone: Milestone
  setupMilestones?: Milestone[] // Added setup milestones array for all concurrent tasks
  databases: CalculatedDatabase[]
  products: CalculatedProduct[]
  deliverables: Array<CalculatedDatabase | CalculatedProduct> // Added ordered deliverables array to maintain user's ordering
  projectEndDate: Date
}

export interface ConsolidatedERP {
  id: string
  name: string
  dataProvider: DataProvider
  connectionProvider: string
  dataExpert: string
  dataDictionary: boolean // Changed from string to boolean for yes/no option
}

export interface ConsolidatedDatabase {
  id: string
  type: DatabaseType
  erpIds: string[] // Which ERPs feed into this database
  validationReportProvider: string
  validationReportConsolidationOwner: string // Consolidation owner per task
  chartOfAccountsProvider: string // Only for Financial Statements
  chartOfAccountsConsolidationOwner: string // Only for Financial Statements
  validationContact: string
  validationConsolidationOwner: string // Consolidation owner per task
}

export interface ConsolidatedProjectConfig {
  projectName: string
  projectStartDate: Date
  erps: ConsolidatedERP[]
  databases: ConsolidatedDatabase[]
}

export type ConsolidatedMilestoneStatus = "Not Started" | "In Progress" | "Complete"

export interface ConsolidatedMilestoneTracking {
  databaseId: string
  milestoneName: string
  erpStatuses: Record<string, ConsolidatedMilestoneStatus> // erpId -> status
}

export type ProductType = "B&F" | "CRM" | "Insights" | "Rebates"

export interface ProductConfig {
  id: string
  type: ProductType
  additionalTrainingSessions: number // Number of additional training sessions beyond the default
  trainingStartDate?: Date // Added optional training start date for B&F when following databases
  crmCustomisationLevel?: "none" | "low" | "medium" | "high" // Added CRM customisation level
  rebatesCustomisationLevel?: "none" | "low" | "medium" | "high" // Added Rebates customisation level
}
