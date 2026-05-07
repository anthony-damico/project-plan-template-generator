"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Package, FileSpreadsheet, Check, X } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { DeliverableConfig, DatabaseType, ProductType } from "@/lib/types"
import { useState } from "react"

interface DeliverableOverviewProps {
  deliverables: DeliverableConfig[]
  onUpdateDeliverable?: (id: string, updates: Partial<DeliverableConfig>) => void
  onAddDeliverable?: (type: "database" | "product") => void
}

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

export function DeliverableOverview({ deliverables, onUpdateDeliverable, onAddDeliverable }: DeliverableOverviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<DeliverableConfig>>({})

  console.log("[v0] DeliverableOverview render", {
    deliverableCount: deliverables.length,
    hasUpdateCallback: !!onUpdateDeliverable,
    hasAddCallback: !!onAddDeliverable,
    editingId,
  })

  const getDeliverableName = (deliverable: DeliverableConfig) => {
    if (deliverable.type === "B&F") return "Budget and Forecast"
    return deliverable.type || "Deliverable"
  }

  const getDeliverableDetails = (deliverable: DeliverableConfig) => {
    if (deliverable.deliverableType === "database") {
      const details = []
      if (deliverable.knowERP) details.push("Known ERP")
      if (deliverable.hasCustomisations) details.push("Has Customisations")
      if (deliverable.hasTrainingFeedback) details.push("Training Feedback")
      if (deliverable.dataProvider === "us") details.push("We Get Data")
      else if (deliverable.dataProvider === "customer") details.push("Customer Provides")
      else if (deliverable.dataProvider === "partner") details.push("Partner Provides")
      return details.join(" • ")
    } else {
      const details = []
      if (
        deliverable.type === "CRM" &&
        deliverable.crmCustomisationLevel &&
        deliverable.crmCustomisationLevel !== "none"
      ) {
        details.push(
          `${deliverable.crmCustomisationLevel.charAt(0).toUpperCase() + deliverable.crmCustomisationLevel.slice(1)} Customisations`,
        )
      }
      if (
        deliverable.type === "Rebates" &&
        deliverable.rebatesCustomisationLevel &&
        deliverable.rebatesCustomisationLevel !== "none"
      ) {
        details.push(
          `${deliverable.rebatesCustomisationLevel.charAt(0).toUpperCase() + deliverable.rebatesCustomisationLevel.slice(1)} Customisations`,
        )
      }
      if (deliverable.additionalTrainingSessions) {
        details.push(
          `+${deliverable.additionalTrainingSessions} Training Session${deliverable.additionalTrainingSessions > 1 ? "s" : ""}`,
        )
      }
      return details.length > 0 ? details.join(" • ") : "Standard configuration"
    }
  }

  const startEditing = (deliverable: DeliverableConfig) => {
    setEditingId(deliverable.id)
    setEditForm({
      type: deliverable.type,
      knowERP: deliverable.knowERP,
      hasCustomisations: deliverable.hasCustomisations,
      hasTrainingFeedback: deliverable.hasTrainingFeedback,
      dataProvider: deliverable.dataProvider,
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEditing = (deliverable: DeliverableConfig) => {
    console.log("[v0] saveEditing called", { deliverable, editForm, onUpdateDeliverable })
    if (onUpdateDeliverable && editForm.type) {
      console.log("[v0] Calling onUpdateDeliverable with:", deliverable.id, editForm)
      onUpdateDeliverable(deliverable.id, editForm)
    }
    setEditingId(null)
    setEditForm({})
  }

  const handleNameChange = (deliverableId: string, newName: string) => {
    console.log("[v0] handleNameChange called", { deliverableId, newName, hasCallback: !!onUpdateDeliverable })
    if (onUpdateDeliverable) {
      onUpdateDeliverable(deliverableId, { type: newName })
    }
  }

  const handleTypeChange = (deliverableId: string, newType: "database" | "product") => {
    console.log("[v0] handleTypeChange called", { deliverableId, newType })
    if (onUpdateDeliverable) {
      const defaultValue = newType === "database" ? DATABASE_TYPES[0] : PRODUCT_TYPES[0]
      onUpdateDeliverable(deliverableId, {
        deliverableType: newType,
        type: defaultValue,
      })
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-card-foreground text-2xl">Deliverables Overview</CardTitle>
            <CardDescription>
              {deliverables.length === 0
                ? "No deliverables added yet. Use the form to add databases or products."
                : `${deliverables.length} deliverable${deliverables.length !== 1 ? "s" : ""} configured for your project`}
            </CardDescription>
          </div>
          {onAddDeliverable && (
            <div className="flex gap-2">
              <Button onClick={() => onAddDeliverable("database")} variant="outline" size="sm" className="gap-2">
                <Database className="h-4 w-4" />
                Quick Add Database
              </Button>
              <Button onClick={() => onAddDeliverable("product")} variant="outline" size="sm" className="gap-2">
                <Package className="h-4 w-4" />
                Quick Add Product
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {deliverables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 border-2 border-dashed border-border rounded-xl bg-muted/30">
            <div className="rounded-full bg-primary/10 p-6 mb-6">
              <FileSpreadsheet className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-card-foreground">No Deliverables Yet</h3>
            <p className="text-muted-foreground text-center max-w-md text-pretty leading-relaxed">
              Add databases and products to your project using the configuration form. They will appear here for easy
              review.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliverables.map((deliverable, index) => (
              <Card key={deliverable.id} className="border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  {editingId === deliverable.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-4">
                          {/* Name Input */}
                          <div className="space-y-2">
                            <Label htmlFor={`name-${deliverable.id}`} className="text-sm font-medium">
                              Deliverable Name
                            </Label>
                            <Input
                              id={`name-${deliverable.id}`}
                              value={editForm.type || ""}
                              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                              placeholder="e.g., Financial Statements, Sales, AR"
                              className="bg-background"
                            />
                          </div>

                          {/* Database-specific options */}
                          {deliverable.deliverableType === "database" && (
                            <>
                              {/* ERP Type */}
                              <div className="space-y-2">
                                <Label htmlFor={`erp-${deliverable.id}`} className="text-sm font-medium">
                                  Database Type
                                </Label>
                                <Select
                                  value={
                                    editForm.knowERP === undefined
                                      ? String(deliverable.knowERP)
                                      : String(editForm.knowERP)
                                  }
                                  onValueChange={(value) => setEditForm({ ...editForm, knowERP: value === "true" })}
                                >
                                  <SelectTrigger className="bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Known ERP</SelectItem>
                                    <SelectItem value="false">Unknown ERP / Spreadsheet</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Data Provider */}
                              <div className="space-y-2">
                                <Label htmlFor={`provider-${deliverable.id}`} className="text-sm font-medium">
                                  Data Provider
                                </Label>
                                <Select
                                  value={editForm.dataProvider || deliverable.dataProvider || "us"}
                                  onValueChange={(value: "us" | "customer" | "partner") =>
                                    setEditForm({ ...editForm, dataProvider: value })
                                  }
                                >
                                  <SelectTrigger className="bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="us">We Get Data</SelectItem>
                                    <SelectItem value="customer">Customer Provides</SelectItem>
                                    <SelectItem value="partner">Partner Provides</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Toggle Options */}
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor={`custom-${deliverable.id}`} className="text-sm">
                                    Has Customisations
                                  </Label>
                                  <Switch
                                    id={`custom-${deliverable.id}`}
                                    checked={editForm.hasCustomisations ?? deliverable.hasCustomisations ?? false}
                                    onCheckedChange={(checked) =>
                                      setEditForm({ ...editForm, hasCustomisations: checked })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor={`training-${deliverable.id}`} className="text-sm">
                                    Training Feedback
                                  </Label>
                                  <Switch
                                    id={`training-${deliverable.id}`}
                                    checked={editForm.hasTrainingFeedback ?? deliverable.hasTrainingFeedback ?? false}
                                    onCheckedChange={(checked) =>
                                      setEditForm({ ...editForm, hasTrainingFeedback: checked })
                                    }
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <Button variant="ghost" size="sm" onClick={cancelEditing} className="gap-1.5">
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveEditing(deliverable)}
                          className="gap-1.5"
                          disabled={!editForm.type?.trim()}
                        >
                          <Check className="h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start gap-4">
                      {/* Deliverable order number badge */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        {deliverable.deliverableType === "database" ? (
                          <div className="p-2.5 rounded-lg bg-blue-500/10">
                            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-lg bg-purple-500/10">
                            <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          {onUpdateDeliverable ? (
                            <div className="flex flex-col gap-2 flex-1">
                              {/* Database/Product toggle buttons */}
                              <div className="flex gap-1 bg-muted p-1 rounded-md w-fit">
                                <Button
                                  variant={deliverable.deliverableType === "database" ? "default" : "ghost"}
                                  size="sm"
                                  onClick={() => handleTypeChange(deliverable.id, "database")}
                                  className="h-7 px-3 text-xs"
                                >
                                  <Database className="h-3.5 w-3.5 mr-1.5" />
                                  Database
                                </Button>
                                <Button
                                  variant={deliverable.deliverableType === "product" ? "default" : "ghost"}
                                  size="sm"
                                  onClick={() => handleTypeChange(deliverable.id, "product")}
                                  className="h-7 px-3 text-xs"
                                >
                                  <Package className="h-3.5 w-3.5 mr-1.5" />
                                  Product
                                </Button>
                              </div>

                              <Select
                                value={deliverable.type}
                                onValueChange={(value) => {
                                  console.log("[v0] Select onValueChange triggered", { value })
                                  handleNameChange(deliverable.id, value)
                                }}
                              >
                                <SelectTrigger className="h-auto px-3 py-1.5 border bg-background hover:bg-accent font-semibold text-base text-left w-full max-w-md rounded-md">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {deliverable.deliverableType === "database"
                                    ? DATABASE_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                          {type}
                                        </SelectItem>
                                      ))
                                    : PRODUCT_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                          {type === "B&F" ? "Budget and Forecast" : type}
                                        </SelectItem>
                                      ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <h3 className="font-semibold text-base truncate">{getDeliverableName(deliverable)}</h3>
                          )}
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-shrink-0">
                            {deliverable.deliverableType}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {getDeliverableDetails(deliverable)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <div className="pt-4 border-t border-border mt-6">
              <p className="text-sm text-muted-foreground text-center">
                Click <strong className="text-foreground">Generate Project Plan</strong> to create your timeline
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DeliverableOverview
