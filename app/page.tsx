"use client"

import { useState } from "react"
import { ProjectForm } from "@/components/project-form"
import { ConsolidatedProjectForm } from "@/components/consolidated-project-form"
import { ProjectTimeline } from "@/components/project-timeline"
import { GanttChart } from "@/components/gantt-chart"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, ArrowLeft } from "@/components/icons"
import { exportToExcel } from "@/lib/excel-export"
import { DeliverableOverview } from "@/components/deliverable-overview"
import type { ProjectConfig, CalculatedProject, MilestoneStatus } from "@/lib/types"

interface MilestoneStatusData {
  status: MilestoneStatus
  actualStartDate?: Date
  actualEndDate?: Date
}

export default function Home() {
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null)
  const [calculatedProject, setCalculatedProject] = useState<CalculatedProject | null>(null)
  const [milestoneStatuses, setMilestoneStatuses] = useState<Record<string, Record<string, MilestoneStatusData>>>({})
  const [activeSection, setActiveSection] = useState<"project-plan" | "consolidated">("project-plan")
  const [currentDeliverables, setCurrentDeliverables] = useState<any[]>([])

  const handleProjectGenerated = (config: ProjectConfig, calculated: CalculatedProject) => {
    setProjectConfig(config)
    setCalculatedProject(calculated)
  }

  const handleDeliverablesUpdate = (deliverables: any[]) => {
    setCurrentDeliverables(deliverables)
  }

  const handleDeliverableUpdate = (id: string, updates: Partial<any>) => {
    console.log("[v0] page.tsx handleDeliverableUpdate", { id, updates })
    setCurrentDeliverables((prev) =>
      prev.map((deliverable) => (deliverable.id === id ? { ...deliverable, ...updates } : deliverable)),
    )
  }

  const handleExport = async () => {
    if (calculatedProject && projectConfig) {
      await exportToExcel(calculatedProject, projectConfig, milestoneStatuses)
    }
  }

  const handleMilestoneUpdate = (updates: Record<string, Record<string, MilestoneStatusData>>) => {
    setMilestoneStatuses(updates)
  }

  const handleAddDeliverable = (type: "database" | "product") => {
    const newId = Date.now().toString()
    const newDeliverable =
      type === "database"
        ? {
            id: newId,
            deliverableType: "database" as const,
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
            deliverableType: "product" as const,
            type: "B&F",
            additionalTrainingSessions: 0,
          }

    setCurrentDeliverables((prev) => [...prev, newDeliverable])
  }

  const handleBackToOverview = () => {
    setCalculatedProject(null)
    setProjectConfig(null)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary text-primary-foreground py-12 px-4 mb-8">
        <div className="container mx-auto max-w-7xl">
          <h1 className="text-5xl font-bold tracking-tight mb-3 text-balance">
            {activeSection === "project-plan" ? "Project Plan Generator" : "Consolidated Projects"}
          </h1>
          <p className="text-primary-foreground/90 text-lg max-w-2xl text-pretty">
            {activeSection === "project-plan"
              ? "Generate custom project plans for data integration and database implementations"
              : "Manage projects with multiple ERPs feeding into one or more databases"}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl pb-12">
        <div className="flex items-center justify-between mb-8">
          <Tabs
            value={activeSection}
            onValueChange={(v) => setActiveSection(v as "project-plan" | "consolidated")}
            className="w-full max-w-md"
          >
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="project-plan" className="text-sm font-medium">
                Project Plan Generator
              </TabsTrigger>
              <TabsTrigger value="consolidated" className="text-sm font-medium">
                Consolidated Projects
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {calculatedProject && activeSection === "project-plan" && (
            <div className="flex gap-2 ml-4">
              <Button onClick={handleBackToOverview} variant="outline" size="lg" className="gap-2 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
                Back to Overview
              </Button>
              <Button onClick={handleExport} size="lg" className="gap-2">
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          )}
        </div>

        {activeSection === "project-plan" ? (
          <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <ProjectForm
                onProjectGenerated={handleProjectGenerated}
                onDeliverablesUpdate={handleDeliverablesUpdate}
                externalDeliverables={currentDeliverables}
              />
            </div>

            <div className="space-y-6">
              {calculatedProject ? (
                <Tabs defaultValue="timeline" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-12 mb-6">
                    <TabsTrigger value="timeline" className="text-sm font-medium">
                      Timeline View
                    </TabsTrigger>
                    <TabsTrigger value="gantt" className="text-sm font-medium">
                      Gantt Chart
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="timeline">
                    <ProjectTimeline
                      project={calculatedProject}
                      onMilestoneUpdate={handleMilestoneUpdate}
                      deliverables={currentDeliverables}
                    />
                  </TabsContent>
                  <TabsContent value="gantt">
                    <GanttChart project={calculatedProject} deliverables={currentDeliverables} />
                  </TabsContent>
                </Tabs>
              ) : (
                <DeliverableOverview
                  deliverables={currentDeliverables}
                  onUpdateDeliverable={handleDeliverableUpdate}
                  onAddDeliverable={handleAddDeliverable}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <ConsolidatedProjectForm />
          </div>
        )}
      </div>
    </main>
  )
}
