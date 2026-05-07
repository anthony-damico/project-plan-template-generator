"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Trash2,
  Calendar,
  Database,
  Package,
  ChevronDown,
  ChevronUp,
  Copy,
  ArrowUp,
  ArrowDown,
} from "@/components/icons"
import { calculateProject } from "@/lib/project-calculator"
import type { ProjectConfig, DeliverableConfig, DatabaseType, ProductType, DeliverableType } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import DeliverableOverview from "@/components/deliverable-overview" // Assuming DeliverableOverview is imported

const DATABASE_TYPES: DatabaseType[] = [
  "Sales",
  "Purchasing, Sales and Stock",
  "Financial Statements",
  "Accounts Receivable",
  "Accounts Payable",
  "Inventory",
  "Bespoke",
]

const PRODUCT_TYPES: ProductType[] = ["B&F", "Insights", "CRM", "Rebates"]

interface ProjectFormProps {
  onProjectGenerated: (config: ProjectConfig, calculated: any) => void
  onDeliverablesUpdate?: (deliverables: DeliverableConfig[]) => void
  externalDeliverables?: DeliverableConfig[]
}

export function ProjectForm({ onProjectGenerated, onDeliverablesUpdate, externalDeliverables }: ProjectFormProps) {
  const [projectName, setProjectName] = useState("New Data Integration Project")
  const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split("T")[0])
  const [executionMode, setExecutionMode] = useState<"sequential" | "parallel">("sequential")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set())
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [activeTab, setActiveTab] = useState<"config" | "overview">("config")

  const [deliverables, setDeliverables] = useState<DeliverableConfig[]>([
    {
      id: "1",
      deliverableType: "database",
      type: "Sales",
      knowERP: true,
      dataProvider: "us",
      hasCustomisations: false,
      hasTrainingFeedback: true,
      hasDataDictionary: false,
      hasDataExpert: false,
    },
  ])

  useEffect(() => {
    onDeliverablesUpdate?.(deliverables)
  }, [])

  useEffect(() => {
    if (externalDeliverables && externalDeliverables.length > 0) {
      console.log("[v0] ProjectForm syncing external deliverables", externalDeliverables)
      setDeliverables(externalDeliverables)
    }
  }, [externalDeliverables])

  const setDeliverablesWithUpdate = (newDeliverables: DeliverableConfig[]) => {
    setDeliverables(newDeliverables)
    onDeliverablesUpdate?.(newDeliverables)
  }

  const addDeliverableWithType = (type: DeliverableType) => {
    const newId = Date.now().toString()
    const newDeliverable: DeliverableConfig =
      type === "database"
        ? {
            id: newId,
            deliverableType: "database",
            type: "Sales",
            knowERP: true,
            dataProvider: "us",
            hasCustomisations: false,
            hasTrainingFeedback: true,
            hasDataDictionary: false,
            hasDataExpert: false,
          }
        : {
            id: newId,
            deliverableType: "product",
            type: "B&F",
            additionalTrainingSessions: 0,
          }

    setDeliverablesWithUpdate([...deliverables, newDeliverable])
    setShowAddDialog(false)

    // Scroll to new card after a brief delay
    setTimeout(() => {
      cardRefs.current[newId]?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }

  const removeDeliverable = (id: string) => {
    console.log("[v0] Removing deliverable:", id)
    setDeliverablesWithUpdate(deliverables.filter((d) => d.id !== id))
  }

  const updateDeliverable = (id: string, updates: Partial<DeliverableConfig>) => {
    console.log("[v0] updateDeliverable called", { id, updates })
    setDeliverablesWithUpdate(deliverables.map((d) => (d.id === id ? { ...d, ...updates } : d)))
  }

  const handleDeliverableTypeToggle = (id: string, isProduct: boolean) => {
    const newType: DeliverableType = isProduct ? "product" : "database"
    if (newType === "database") {
      updateDeliverable(id, {
        deliverableType: "database",
        type: "Sales",
        knowERP: true,
        dataProvider: "us",
        hasCustomisations: false,
        hasTrainingFeedback: true,
        hasDataDictionary: false,
        hasDataExpert: false,
        additionalTrainingSessions: undefined,
        crmCustomisationLevel: undefined,
        rebatesCustomisationLevel: undefined,
      })
    } else {
      updateDeliverable(id, {
        deliverableType: "product",
        type: "B&F",
        additionalTrainingSessions: 0,
        knowERP: undefined,
        dataProvider: undefined,
        hasCustomisations: undefined,
        hasTrainingFeedback: undefined,
        hasDataDictionary: undefined,
        hasDataExpert: undefined,
        crmCustomisationLevel: undefined,
        rebatesCustomisationLevel: undefined,
      })
    }
  }

  const moveDeliverable = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= deliverables.length) return

    const newDeliverables = [...deliverables]
    const [removed] = newDeliverables.splice(index, 1)
    newDeliverables.splice(newIndex, 0, removed)
    setDeliverablesWithUpdate(newDeliverables)
  }

  const duplicateDeliverable = (deliverable: DeliverableConfig) => {
    const newDeliverable = {
      ...deliverable,
      id: Date.now().toString(),
    }
    setDeliverablesWithUpdate([...deliverables, newDeliverable])
  }

  const toggleCardCollapse = (id: string) => {
    const newCollapsed = new Set(collapsedCards)
    if (newCollapsed.has(id)) {
      newCollapsed.delete(id)
    } else {
      newCollapsed.add(id)
    }
    setCollapsedCards(newCollapsed)
  }

  const scrollToDeliverable = (id: string) => {
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
    //setShowSidebar(false) // Removed as sidebar is replaced by tabs
  }

  const handleGenerate = () => {
    const config: ProjectConfig = {
      projectName,
      projectStartDate: new Date(projectStartDate),
      executionMode,
      deliverables,
    }
    const calculated = calculateProject(config)
    onProjectGenerated(config, calculated)
  }

  const getDeliverableName = (deliverable: DeliverableConfig) => {
    if (deliverable.type === "B&F") return "Budget and Forecast"
    return deliverable.type || "Deliverable"
  }

  const getDeliverableAcronym = (deliverable: DeliverableConfig) => {
    const name = getDeliverableName(deliverable)

    // Handle known acronyms
    if (deliverable.type === "B&F") return "B&F"
    if (deliverable.type === "CRM") return "CRM"
    if (deliverable.type === "Purchasing, Sales and Stock") return "PSS"

    // Generate acronym only from multi-word names
    const words = name.split(/[\s&]+/).filter((word) => word.length > 0)
    if (words.length > 1) {
      return words.map((word) => word[0].toUpperCase()).join("")
    }

    // For single words, return the full name (no acronym needed)
    return name
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Project Configuration</CardTitle>
            <CardDescription>Configure your data integration project details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Project Start Date</Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  value={projectStartDate}
                  onChange={(e) => setProjectStartDate(e.target.value)}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label>Execution Mode</Label>
                <p className="text-sm text-muted-foreground">
                  {executionMode === "sequential" ? "Databases run one after another" : "Databases run in parallel"}
                </p>
              </div>
              <Switch
                checked={executionMode === "parallel"}
                onCheckedChange={(checked) => setExecutionMode(checked ? "parallel" : "sequential")}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Deliverables ({deliverables.length})</Label>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-transparent"
                >
                  <Plus className="h-4 w-4" />
                  Add Deliverable
                </Button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {deliverables.map((deliverable, index) => (
                  <Card
                    key={deliverable.id}
                    ref={(el) => {
                      cardRefs.current[deliverable.id] = el
                    }}
                    className="border-border bg-muted/30 overflow-hidden"
                  >
                    <CardHeader className="pb-2 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CardTitle className="text-base font-semibold cursor-default">
                                  {getDeliverableAcronym(deliverable)}
                                </CardTitle>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>{getDeliverableName(deliverable)}</p>
                              </TooltipContent>
                            </Tooltip>
                            <p className="text-xs text-muted-foreground truncate">
                              {deliverable.deliverableType === "database" ? "Database" : "Product"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                          <Button
                            onClick={() => moveDeliverable(index, "up")}
                            disabled={index === 0}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => moveDeliverable(index, "down")}
                            disabled={index === deliverables.length - 1}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => duplicateDeliverable(deliverable)}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => toggleCardCollapse(deliverable.id)}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            {collapsedCards.has(deliverable.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => removeDeliverable(deliverable.id)}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {!collapsedCards.has(deliverable.id) && (
                      <CardContent className="space-y-3 pt-2">
                        <div className="flex items-center justify-between py-1">
                          <Label className="text-sm font-medium">Type</Label>
                          <div className="flex items-center gap-2 bg-muted rounded-md p-1">
                            <button
                              onClick={() => handleDeliverableTypeToggle(deliverable.id, false)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                deliverable.deliverableType === "database"
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Database className="h-3.5 w-3.5" />
                                Database
                              </div>
                            </button>
                            <button
                              onClick={() => handleDeliverableTypeToggle(deliverable.id, true)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                deliverable.deliverableType === "product"
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5" />
                                Product
                              </div>
                            </button>
                          </div>
                        </div>

                        {deliverable.deliverableType === "database" && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Database Type</Label>
                              <Select
                                value={deliverable.type as string}
                                onValueChange={(value) =>
                                  updateDeliverable(deliverable.id, { type: value as DatabaseType })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DATABASE_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center justify-between py-1">
                              <Label className="text-sm font-medium">Has Training Feedback?</Label>
                              <Switch
                                checked={deliverable.hasTrainingFeedback}
                                onCheckedChange={(checked) =>
                                  updateDeliverable(deliverable.id, { hasTrainingFeedback: checked })
                                }
                              />
                            </div>

                            <div className="flex items-center justify-between py-1">
                              <Label className="text-sm font-medium">Know ERP?</Label>
                              <Switch
                                checked={deliverable.knowERP}
                                onCheckedChange={(checked) => updateDeliverable(deliverable.id, { knowERP: checked })}
                              />
                            </div>

                            {!deliverable.knowERP && (
                              <>
                                <div className="flex items-center justify-between py-1">
                                  <Label className="text-sm">Has Data Expert?</Label>
                                  <Switch
                                    checked={deliverable.hasDataExpert}
                                    onCheckedChange={(checked) =>
                                      updateDeliverable(deliverable.id, { hasDataExpert: checked })
                                    }
                                  />
                                </div>

                                <div className="flex items-center justify-between py-1">
                                  <Label className="text-sm">Has Data Dictionary?</Label>
                                  <Switch
                                    checked={deliverable.hasDataDictionary}
                                    onCheckedChange={(checked) =>
                                      updateDeliverable(deliverable.id, { hasDataDictionary: checked })
                                    }
                                  />
                                </div>
                              </>
                            )}

                            <div className="flex items-center justify-between py-1">
                              <Label className="text-sm font-medium">Has Customisations?</Label>
                              <Switch
                                checked={deliverable.hasCustomisations}
                                onCheckedChange={(checked) =>
                                  updateDeliverable(deliverable.id, { hasCustomisations: checked })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Data Provider</Label>
                              <Select
                                value={deliverable.dataProvider}
                                onValueChange={(value) =>
                                  updateDeliverable(deliverable.id, {
                                    dataProvider: value as "us" | "customer" | "partner",
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="us">We get the data</SelectItem>
                                  <SelectItem value="customer">Customer provides</SelectItem>
                                  <SelectItem value="partner">Partner provides</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        {deliverable.deliverableType === "product" && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Product Type</Label>
                              <Select
                                value={deliverable.type as string}
                                onValueChange={(value) =>
                                  updateDeliverable(deliverable.id, { type: value as ProductType })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRODUCT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type === "B&F"
                                        ? "Budget and Forecast"
                                        : type === "Insights"
                                          ? "Insights"
                                          : type === "CRM"
                                            ? "CRM"
                                            : type === "Rebates"
                                              ? "Rebates"
                                              : type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {deliverable.type === "CRM" && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Customisation Level</Label>
                                <Select
                                  value={deliverable.crmCustomisationLevel || "none"}
                                  onValueChange={(value) =>
                                    updateDeliverable(deliverable.id, {
                                      crmCustomisationLevel: value as "none" | "low" | "medium" | "high",
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No Customisations</SelectItem>
                                    <SelectItem value="low">Low (1 week)</SelectItem>
                                    <SelectItem value="medium">Medium (2 weeks)</SelectItem>
                                    <SelectItem value="high">High (4 weeks)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {deliverable.type === "Rebates" && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Customisation Level</Label>
                                <Select
                                  value={deliverable.rebatesCustomisationLevel || "none"}
                                  onValueChange={(value) =>
                                    updateDeliverable(deliverable.id, {
                                      rebatesCustomisationLevel: value as "none" | "low" | "medium" | "high",
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No Customisations</SelectItem>
                                    <SelectItem value="low">Low (1 week)</SelectItem>
                                    <SelectItem value="medium">Medium (2 weeks)</SelectItem>
                                    <SelectItem value="high">High (4 weeks)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="flex items-center justify-between py-1">
                              <Label className="text-sm font-medium">Additional Training Sessions?</Label>
                              <Switch
                                checked={(deliverable.additionalTrainingSessions || 0) > 0}
                                onCheckedChange={(checked) =>
                                  updateDeliverable(deliverable.id, { additionalTrainingSessions: checked ? 1 : 0 })
                                }
                              />
                            </div>

                            {(deliverable.additionalTrainingSessions || 0) > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm">Number of Additional Sessions</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={deliverable.additionalTrainingSessions}
                                  onChange={(e) =>
                                    updateDeliverable(deliverable.id, {
                                      additionalTrainingSessions: Math.max(1, Number.parseInt(e.target.value) || 1),
                                    })
                                  }
                                />
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {activeTab === "overview" && (
          <DeliverableOverview
            deliverables={deliverables}
            onUpdateDeliverable={updateDeliverable}
            onAddDeliverable={addDeliverableWithType}
          />
        )}

        <Button onClick={handleGenerate} className="w-full" size="lg">
          Generate Project Plan
        </Button>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Deliverable</DialogTitle>
              <DialogDescription>Choose the type of deliverable you want to add to your project</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <button
                onClick={() => addDeliverableWithType("database")}
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent transition-all"
              >
                <div className="p-3 rounded-full bg-primary/10">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-sm mb-1">Database</h4>
                  <p className="text-xs text-muted-foreground">Add a database integration</p>
                </div>
              </button>
              <button
                onClick={() => addDeliverableWithType("product")}
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent transition-all"
              >
                <div className="p-3 rounded-full bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-sm mb-1">Product</h4>
                  <p className="text-xs text-muted-foreground">Add a product implementation</p>
                </div>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
