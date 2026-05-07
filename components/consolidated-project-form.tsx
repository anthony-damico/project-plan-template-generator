"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Download } from "@/components/icons"
import { useToast } from "@/hooks/use-toast"
import type { ConsolidatedERP, ConsolidatedDatabase, DatabaseType, ConsolidatedProjectConfig } from "@/lib/types"
import { exportConsolidatedProject } from "@/lib/consolidated-export"

const DATABASE_TYPES: DatabaseType[] = [
  "Sales",
  "Purchasing, Sales and Stock",
  "Financial Statements",
  "Accounts Receivable",
  "Accounts Payable",
  "Inventory",
  "Bespoke",
]

export function ConsolidatedProjectForm() {
  const { toast } = useToast()
  const [projectName, setProjectName] = useState("New Consolidated Project")
  const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split("T")[0])
  const [erps, setErps] = useState<ConsolidatedERP[]>([
    {
      id: crypto.randomUUID(),
      name: "",
      dataProvider: "phocas",
      connectionProvider: "",
      dataExpert: "",
      dataDictionary: false, // Changed default from empty string to false
    },
  ])
  const [databases, setDatabases] = useState<ConsolidatedDatabase[]>([
    {
      id: crypto.randomUUID(),
      type: "Sales",
      erpIds: [],
      validationReportProvider: "",
      validationReportConsolidationOwner: "", // Added consolidation owner per task
      chartOfAccountsProvider: "",
      chartOfAccountsConsolidationOwner: "", // Added consolidation owner per task
      validationContact: "",
      validationConsolidationOwner: "", // Added consolidation owner per task
    },
  ])

  const addERP = () => {
    setErps([
      ...erps,
      {
        id: crypto.randomUUID(),
        name: "",
        dataProvider: "phocas",
        connectionProvider: "",
        dataExpert: "",
        dataDictionary: false, // Changed default from empty string to false
      },
    ])
  }

  const removeERP = (id: string) => {
    setErps(erps.filter((erp) => erp.id !== id))
    setDatabases(
      databases.map((db) => ({
        ...db,
        erpIds: db.erpIds.filter((erpId) => erpId !== id),
      })),
    )
  }

  const updateERP = (id: string, field: keyof ConsolidatedERP, value: string) => {
    setErps(erps.map((erp) => (erp.id === id ? { ...erp, [field]: value } : erp)))
  }

  const updateERPBoolean = (id: string, field: keyof ConsolidatedERP, value: boolean) => {
    setErps(erps.map((erp) => (erp.id === id ? { ...erp, [field]: value } : erp)))
  }

  const addDatabase = () => {
    setDatabases([
      ...databases,
      {
        id: crypto.randomUUID(),
        type: "Sales",
        erpIds: [],
        validationReportProvider: "",
        validationReportConsolidationOwner: "", // Added consolidation owner per task
        chartOfAccountsProvider: "",
        chartOfAccountsConsolidationOwner: "", // Added consolidation owner per task
        validationContact: "",
        validationConsolidationOwner: "", // Added consolidation owner per task
      },
    ])
  }

  const removeDatabase = (id: string) => {
    setDatabases(databases.filter((db) => db.id !== id))
  }

  const updateDatabase = (id: string, field: keyof ConsolidatedDatabase, value: string) => {
    setDatabases(databases.map((db) => (db.id === id ? { ...db, [field]: value } : db)))
  }

  const updateDatabaseType = (id: string, type: DatabaseType) => {
    setDatabases(databases.map((db) => (db.id === id ? { ...db, type } : db)))
  }

  const toggleERPMapping = (databaseId: string, erpId: string) => {
    setDatabases(
      databases.map((db) => {
        if (db.id === databaseId) {
          const erpIds = db.erpIds.includes(erpId) ? db.erpIds.filter((id) => id !== erpId) : [...db.erpIds, erpId]
          return { ...db, erpIds }
        }
        return db
      }),
    )
  }

  const toggleAllERPs = (databaseId: string) => {
    setDatabases(
      databases.map((db) => {
        if (db.id === databaseId) {
          const allSelected = erps.every((erp) => db.erpIds.includes(erp.id))
          return { ...db, erpIds: allSelected ? [] : erps.map((erp) => erp.id) }
        }
        return db
      }),
    )
  }

  const handleExportProject = async () => {
    console.log("[v0] Export project button clicked")
    console.log("[v0] Current state:", { projectName, erpsCount: erps.length, databasesCount: databases.length })
    console.log("[v0] ERPs:", JSON.stringify(erps))
    console.log("[v0] Databases:", JSON.stringify(databases))
    
    if (!projectName.trim()) {
      console.log("[v0] Validation failed: project name empty")
      const toastResult = toast({
        title: "Project Name Required",
        description: "Please enter a project name before exporting",
        variant: "destructive",
      })
      console.log("[v0] Toast triggered:", toastResult)
      return
    }

    if (erps.length === 0 || erps.every((erp) => !erp.name.trim())) {
      console.log("[v0] Validation failed: no ERP with name")
      toast({
        title: "ERP Required",
        description: "Please add at least one ERP with a name",
        variant: "destructive",
      })
      return
    }

    if (databases.length === 0) {
      console.log("[v0] Validation failed: no databases")
      toast({
        title: "Database Required",
        description: "Please add at least one database",
        variant: "destructive",
      })
      return
    }
    
    console.log("[v0] All validations passed")

    const config: ConsolidatedProjectConfig = {
      projectName,
      projectStartDate: new Date(projectStartDate),
      erps,
      databases,
    }

    console.log("[v0] Calling exportConsolidatedProject with config:", config)
    try {
      await exportConsolidatedProject(config)
      console.log("[v0] Export completed successfully")
      toast({
        title: "Success",
        description: "Project exported successfully with both responsibility matrix and update template",
      })
    } catch (error) {
      console.error("[v0] Export error:", error)
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export project",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Basic details about your consolidated project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name <span className="text-destructive">*</span></Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Project Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={projectStartDate}
              onChange={(e) => setProjectStartDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Sources / ERPs</CardTitle>
          <CardDescription>Add all ERP systems and their details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {erps.map((erp, index) => (
            <div key={erp.id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex gap-3 items-center justify-between">
                <h4 className="font-medium">ERP {index + 1}</h4>
                <Button variant="outline" size="icon" onClick={() => removeERP(erp.id)} disabled={erps.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`erp-name-${erp.id}`}>ERP Name</Label>
                  <Input
                    id={`erp-name-${erp.id}`}
                    value={erp.name}
                    onChange={(e) => updateERP(erp.id, "name", e.target.value)}
                    placeholder="e.g., SAP, Oracle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`erp-provider-${erp.id}`}>Data Provider</Label>
                  <Select value={erp.dataProvider} onValueChange={(value) => updateERP(erp.id, "dataProvider", value)}>
                    <SelectTrigger id={`erp-provider-${erp.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phocas">Phocas</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`erp-connection-${erp.id}`}>Connection Provider</Label>
                  <Input
                    id={`erp-connection-${erp.id}`}
                    value={erp.connectionProvider}
                    onChange={(e) => updateERP(erp.id, "connectionProvider", e.target.value)}
                    placeholder="Person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`erp-expert-${erp.id}`}>Data Expert</Label>
                  <Input
                    id={`erp-expert-${erp.id}`}
                    value={erp.dataExpert}
                    onChange={(e) => updateERP(erp.id, "dataExpert", e.target.value)}
                    placeholder="Person name"
                  />
                </div>
                <div className="space-y-2 flex items-center gap-2">
                  <Checkbox
                    id={`erp-dictionary-${erp.id}`}
                    checked={erp.dataDictionary}
                    onCheckedChange={(checked) => updateERPBoolean(erp.id, "dataDictionary", checked as boolean)}
                  />
                  <Label htmlFor={`erp-dictionary-${erp.id}`} className="cursor-pointer">
                    Has Data Dictionary
                  </Label>
                </div>
              </div>
            </div>
          ))}
          <Button onClick={addERP} variant="outline" className="w-full gap-2 bg-transparent">
            <Plus className="h-4 w-4" />
            Add ERP
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Databases</CardTitle>
          <CardDescription>Configure databases and their details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {databases.map((db, index) => (
            <div key={db.id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex gap-3 items-center justify-between">
                <h4 className="font-medium">Database {index + 1}</h4>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeDatabase(db.id)}
                  disabled={databases.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor={`db-type-${db.id}`}>Database Type</Label>
                  <Select value={db.type} onValueChange={(value) => updateDatabaseType(db.id, value as DatabaseType)}>
                    <SelectTrigger id={`db-type-${db.id}`}>
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
                <div className="space-y-2">
                  <Label htmlFor={`db-validation-${db.id}`}>Validation Report Provider</Label>
                  <Input
                    id={`db-validation-${db.id}`}
                    value={db.validationReportProvider}
                    onChange={(e) => updateDatabase(db.id, "validationReportProvider", e.target.value)}
                    placeholder="Person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`db-validation-owner-${db.id}`}>Validation Report Consolidation Owner</Label>
                  <Input
                    id={`db-validation-owner-${db.id}`}
                    value={db.validationReportConsolidationOwner}
                    onChange={(e) => updateDatabase(db.id, "validationReportConsolidationOwner", e.target.value)}
                    placeholder="Person name"
                  />
                </div>
                {db.type === "Financial Statements" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`db-chart-${db.id}`}>Chart of Accounts Provider</Label>
                      <Input
                        id={`db-chart-${db.id}`}
                        value={db.chartOfAccountsProvider}
                        onChange={(e) => updateDatabase(db.id, "chartOfAccountsProvider", e.target.value)}
                        placeholder="Person name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`db-chart-owner-${db.id}`}>Chart of Accounts Consolidation Owner</Label>
                      <Input
                        id={`db-chart-owner-${db.id}`}
                        value={db.chartOfAccountsConsolidationOwner}
                        onChange={(e) => updateDatabase(db.id, "chartOfAccountsConsolidationOwner", e.target.value)}
                        placeholder="Person name"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor={`db-contact-${db.id}`}>
                    {db.type === "Financial Statements"
                      ? "Contact to validate and map statements"
                      : "Contact to validate"}
                  </Label>
                  <Input
                    id={`db-contact-${db.id}`}
                    value={db.validationContact}
                    onChange={(e) => updateDatabase(db.id, "validationContact", e.target.value)}
                    placeholder="Person name"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor={`db-contact-owner-${db.id}`}>Validation Consolidation Owner</Label>
                  <Input
                    id={`db-contact-owner-${db.id}`}
                    value={db.validationConsolidationOwner}
                    onChange={(e) => updateDatabase(db.id, "validationConsolidationOwner", e.target.value)}
                    placeholder="Person name"
                  />
                </div>
              </div>
            </div>
          ))}
          <Button onClick={addDatabase} variant="outline" className="w-full gap-2 bg-transparent">
            <Plus className="h-4 w-4" />
            Add Database
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ERP to Database Mapping</CardTitle>
          <CardDescription>Select which ERPs feed into which databases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Database</th>
                  <th className="text-center p-3 font-medium min-w-[80px]">Select All</th>
                  {erps.map((erp) => (
                    <th key={erp.id} className="text-center p-3 font-medium min-w-[100px]">
                      {erp.name || `ERP ${erps.indexOf(erp) + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {databases.map((db) => {
                  const allSelected = erps.length > 0 && erps.every((erp) => db.erpIds.includes(erp.id))
                  const someSelected = erps.some((erp) => db.erpIds.includes(erp.id)) && !allSelected

                  return (
                    <tr key={db.id} className="border-b">
                      <td className="p-3 font-medium">{db.type}</td>
                      <td className="text-center p-3">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => toggleAllERPs(db.id)}
                            className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                          />
                        </div>
                      </td>
                      {erps.map((erp) => (
                        <td key={erp.id} className="text-center p-3">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={db.erpIds.includes(erp.id)}
                              onCheckedChange={() => toggleERPMapping(db.id, erp.id)}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleExportProject} size="lg" className="w-full gap-2">
          <Download className="h-4 w-4" />
          Export Project
        </Button>
      </div>
    </div>
  )
}
