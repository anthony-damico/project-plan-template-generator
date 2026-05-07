"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CalculatedProject } from "@/lib/types"
import { format, differenceInDays } from "@/lib/date-utils"

interface GanttChartProps {
  project: CalculatedProject
  deliverables?: any[] // Added deliverables prop to track original order
}

export function GanttChart({ project, deliverables }: GanttChartProps) {
  const projectStart = new Date(project.projectStartDate)
  const projectEnd = new Date(project.projectEndDate)
  const totalDays = differenceInDays(projectEnd, projectStart)

  const getBarPosition = (startDate: Date | string, endDate: Date | string) => {
    const start = startDate instanceof Date ? startDate : new Date(startDate)
    const end = endDate instanceof Date ? endDate : new Date(endDate)

    const startDiff = differenceInDays(start, projectStart)
    const duration = differenceInDays(end, start)
    const left = (startDiff / totalDays) * 100
    const width = (duration / totalDays) * 100
    return { left: `${Math.max(0, left)}%`, width: `${Math.max(0, width)}%` }
  }

  const getDeliverableOrderNumber = (deliverableId: string): number => {
    if (!deliverables) {
      return project.deliverables.findIndex((d) => d.id === deliverableId) + 1
    }
    const index = deliverables.findIndex((d) => d.id === deliverableId)
    return index !== -1 ? index + 1 : 0
  }

  const colors = [
    "bg-primary",
    "bg-accent",
    "bg-chart-1",
    "bg-chart-2",
    "bg-chart-3",
    "bg-cyan-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-amber-500",
  ]

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground">Gantt Chart</CardTitle>
        <CardDescription>Visual timeline of all deliverables and milestones</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Timeline header */}
          <div className="relative h-12 border-b border-border">
            <div className="absolute inset-0 flex items-end justify-between px-2 pb-2">
              <span className="text-xs text-muted-foreground">{format(projectStart, "MMM dd, yyyy")}</span>
              <span className="text-xs text-muted-foreground">{format(projectEnd, "MMM dd, yyyy")}</span>
            </div>
          </div>

          {/* Setup milestones */}
          {project.setupMilestones && project.setupMilestones.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <h4 className="font-semibold text-sm text-card-foreground">Initial Setup</h4>
              </div>
              <div className="space-y-2 pl-6">
                {project.setupMilestones.map((milestone, index) => (
                  <div key={index} className="relative h-10">
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                      <div className="w-full h-px bg-border" />
                    </div>
                    <div
                      className="absolute h-8 bg-primary rounded-md flex items-center px-3 shadow-sm"
                      style={getBarPosition(milestone.plannedStartDate, milestone.plannedEndDate)}
                    >
                      <span className="text-xs font-medium text-primary-foreground truncate">{milestone.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.deliverables &&
            project.deliverables.map((deliverable, index) => {
              const isDatabase = "milestones" in deliverable && !("name" in deliverable)
              const name = isDatabase ? deliverable.type : deliverable.name
              const milestones = deliverable.milestones
              const totalWeeks = deliverable.totalDurationWeeks

              const orderNumber = getDeliverableOrderNumber(deliverable.id)

              return (
                <div key={deliverable.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                    <h4 className="font-semibold text-sm text-card-foreground">
                      {orderNumber}. {name}
                    </h4>
                    <span className="text-xs text-muted-foreground">({totalWeeks} weeks)</span>
                  </div>

                  <div className="space-y-2 pl-6">
                    {milestones.map((milestone, mIndex) => {
                      const position = getBarPosition(milestone.plannedStartDate, milestone.plannedEndDate)
                      return (
                        <div key={mIndex} className="relative h-10">
                          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                            <div className="w-full h-px bg-border" />
                          </div>
                          <div
                            className={`absolute h-8 ${colors[index % colors.length]} rounded-md flex items-center px-3 shadow-sm`}
                            style={position}
                          >
                            <span className="text-xs font-medium text-primary-foreground truncate">
                              {milestone.name}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )
}
