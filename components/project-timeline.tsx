"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CalculatedProject, Milestone, MilestoneStatus, CalculatedDatabase, CalculatedProduct } from "@/lib/types"
import { format, differenceInBusinessDays, addBusinessDays } from "@/lib/date-utils"

interface ProjectTimelineProps {
  project: CalculatedProject
  onMilestoneUpdate?: (updates: Record<string, Record<string, MilestoneStatusData>>) => void
  deliverables?: any[]
}

interface MilestoneStatusData {
  status: MilestoneStatus
  actualStartDate?: Date
  actualEndDate?: Date
}

export function ProjectTimeline({ project, onMilestoneUpdate, deliverables }: ProjectTimelineProps) {
  const [milestoneData, setMilestoneData] = useState<
    Record<
      string,
      Record<
        string,
        {
          status: MilestoneStatus
          actualStartDate?: Date
          actualEndDate?: Date
        }
      >
    >
  >(() => {
    const initialData: Record<string, Record<string, MilestoneStatusData>> = {
      _project: {},
    }

    project.setupMilestones?.forEach((milestone) => {
      initialData._project[milestone.name] = {
        status: "Not started",
        actualStartDate: undefined,
        actualEndDate: undefined,
      }
    })

    project.deliverables.forEach((deliverable) => {
      initialData[deliverable.id] = {}
      deliverable.milestones.forEach((milestone) => {
        initialData[deliverable.id][milestone.name] = {
          status: "Not started",
          actualStartDate: undefined,
          actualEndDate: undefined,
        }
      })
    })

    return initialData
  })

  const updateMilestone = (
    dbId: string,
    milestoneName: string,
    updates: Partial<{
      status: MilestoneStatus
      actualStartDate: Date
      actualEndDate: Date
    }>,
  ) => {
    setMilestoneData((prev) => {
      const updated = {
        ...prev,
        [dbId]: {
          ...prev[dbId],
          [milestoneName]: {
            ...prev[dbId]?.[milestoneName],
            ...updates,
          },
        },
      }
      onMilestoneUpdate?.(updated)
      return updated
    })
  }

  const getMilestoneData = (dbId: string, milestoneName: string) => {
    return (
      milestoneData[dbId]?.[milestoneName] || {
        status: "Not started",
        actualStartDate: undefined,
        actualEndDate: undefined,
      }
    )
  }

  const getStartVariance = (milestone: Milestone, dbId: string): number | null => {
    const data = getMilestoneData(dbId, milestone.name)
    if (!data.actualStartDate) return null
    return differenceInBusinessDays(data.actualStartDate, milestone.plannedStartDate)
  }

  const getEndVariance = (milestone: Milestone, dbId: string): number | null => {
    const data = getMilestoneData(dbId, milestone.name)
    if (!data.actualEndDate) return null
    return differenceInBusinessDays(data.actualEndDate, milestone.plannedEndDate)
  }

  const getVarianceStatus = (variance: number | null) => {
    if (variance === null || variance === 0) return "default"
    if (variance > 0) return "destructive"
    return "default"
  }

  const getStatusColor = (status: MilestoneStatus) => {
    switch (status) {
      case "Complete":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "In progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "On Hold":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const calculateDatabaseForecastEndDate = (dbId: string, milestones: Milestone[]): Date | null => {
    const hasAnyActualDates = milestones.some((milestone) => {
      const data = getMilestoneData(dbId, milestone.name)
      return data.actualStartDate || data.actualEndDate
    })

    if (!hasAnyActualDates) {
      return null
    }

    let currentForecastDate: Date | null = null

    for (const milestone of milestones) {
      const data = getMilestoneData(dbId, milestone.name)
      const plannedDurationDays = milestone.durationWeeks * 5

      if (data.actualEndDate) {
        currentForecastDate = data.actualEndDate
      } else if (data.actualStartDate) {
        currentForecastDate = addBusinessDays(data.actualStartDate, plannedDurationDays)
      } else {
        const forecastStartDate = currentForecastDate || milestone.plannedStartDate
        currentForecastDate = addBusinessDays(forecastStartDate, plannedDurationDays)
      }
    }

    return currentForecastDate
  }

  const getForecastVariance = (plannedEndDate: Date, forecastEndDate: Date | null): number | null => {
    if (!forecastEndDate) return null
    return differenceInBusinessDays(forecastEndDate, plannedEndDate)
  }

  const getDeliverableOrderNumber = (deliverableId: string): number => {
    if (!deliverables) {
      // Fallback to index in project.deliverables if original order not available
      return project.deliverables.findIndex((d) => d.id === deliverableId) + 1
    }
    const index = deliverables.findIndex((d) => d.id === deliverableId)
    return index !== -1 ? index + 1 : 0
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">{project.projectName}</CardTitle>
          <CardDescription>
            Project Timeline - {format(project.projectStartDate, "MMM dd, yyyy")} to{" "}
            {format(project.projectEndDate, "MMM dd, yyyy")}
          </CardDescription>
        </CardHeader>
      </Card>

      {project.setupMilestones && project.setupMilestones.length > 0 && (
        <Card className="border-border bg-card border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-card-foreground">Initial Setup</CardTitle>
                <CardDescription>Concurrent tasks that run at project start</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-primary/10">
                Project Level
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Milestone</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Duration</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Planned Start</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Planned End</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actual Start</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actual End</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Start Variance</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">End Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {project.setupMilestones.map((milestone, index) => {
                    const data = getMilestoneData("_project", milestone.name)
                    const startVariance = getStartVariance(milestone, "_project")
                    const endVariance = getEndVariance(milestone, "_project")

                    return (
                      <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium text-card-foreground">{milestone.name}</td>
                        <td className="py-3 px-4">
                          <Select
                            value={data.status}
                            onValueChange={(value) =>
                              updateMilestone("_project", milestone.name, {
                                status: value as MilestoneStatus,
                              })
                            }
                          >
                            <SelectTrigger className={`w-32 h-8 ${getStatusColor(data.status)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Not started">Not started</SelectItem>
                              <SelectItem value="In progress">In progress</SelectItem>
                              <SelectItem value="Complete">Complete</SelectItem>
                              <SelectItem value="On Hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{milestone.durationWeeks} weeks</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {format(milestone.plannedStartDate, "MMM dd, yyyy")}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {format(milestone.plannedEndDate, "MMM dd, yyyy")}
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="date"
                            value={data.actualStartDate ? format(data.actualStartDate, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              const date = e.target.value ? new Date(e.target.value) : undefined
                              updateMilestone("_project", milestone.name, { actualStartDate: date })
                            }}
                            className="w-36 h-8"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="date"
                            value={data.actualEndDate ? format(data.actualEndDate, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              const date = e.target.value ? new Date(e.target.value) : undefined
                              updateMilestone("_project", milestone.name, { actualEndDate: date })
                            }}
                            className="w-36 h-8"
                          />
                        </td>
                        <td className="py-3 px-4">
                          {startVariance !== null ? (
                            <Badge variant={getVarianceStatus(startVariance)} className="text-xs">
                              {startVariance > 0
                                ? `+${startVariance}d`
                                : startVariance === 0
                                  ? "On time"
                                  : `${startVariance}d`}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {endVariance !== null ? (
                            <Badge variant={getVarianceStatus(endVariance)} className="text-xs">
                              {endVariance > 0 ? `+${endVariance}d` : endVariance === 0 ? "On time" : `${endVariance}d`}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {project.deliverables.map((deliverable, deliverableIndex) => {
        const isDatabase = "type" in deliverable && !("name" in deliverable)
        const displayName = isDatabase
          ? (deliverable as CalculatedDatabase).type
          : (deliverable as CalculatedProduct).name
        const deliverableType = isDatabase ? "Database" : "Product"

        const orderNumber = getDeliverableOrderNumber(deliverable.id)

        const forecastEndDate = calculateDatabaseForecastEndDate(deliverable.id, deliverable.milestones)
        const forecastVariance = getForecastVariance(deliverable.endDate, forecastEndDate)

        return (
          <Card key={deliverable.id} className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-card-foreground">
                    {orderNumber}. {displayName}
                  </CardTitle>
                  <CardDescription>
                    {format(deliverable.startDate, "MMM dd, yyyy")} - {format(deliverable.endDate, "MMM dd, yyyy")} (
                    {deliverable.totalDurationWeeks} weeks)
                  </CardDescription>
                  {forecastEndDate && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-medium text-card-foreground">Forecast End:</span>
                      <span className="text-sm text-muted-foreground">{format(forecastEndDate, "MMM dd, yyyy")}</span>
                      {forecastVariance !== null && forecastVariance !== 0 && (
                        <Badge variant={forecastVariance > 0 ? "destructive" : "default"} className="text-xs">
                          {forecastVariance > 0 ? `+${forecastVariance}d` : `${forecastVariance}d`} vs planned
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {deliverableType} #{orderNumber}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Milestone</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Duration</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Planned Start</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Planned End</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actual Start</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actual End</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Start Variance</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">End Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliverable.milestones.map((milestone, index) => {
                      const data = getMilestoneData(deliverable.id, milestone.name)
                      const startVariance = getStartVariance(milestone, deliverable.id)
                      const endVariance = getEndVariance(milestone, deliverable.id)

                      return (
                        <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium text-card-foreground">{milestone.name}</td>
                          <td className="py-3 px-4">
                            <Select
                              value={data.status}
                              onValueChange={(value) =>
                                updateMilestone(deliverable.id, milestone.name, { status: value as MilestoneStatus })
                              }
                            >
                              <SelectTrigger className={`w-32 h-8 ${getStatusColor(data.status)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Not started">Not started</SelectItem>
                                <SelectItem value="In progress">In progress</SelectItem>
                                <SelectItem value="Complete">Complete</SelectItem>
                                <SelectItem value="On Hold">On Hold</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{milestone.durationWeeks} weeks</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {format(milestone.plannedStartDate, "MMM dd, yyyy")}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {format(milestone.plannedEndDate, "MMM dd, yyyy")}
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="date"
                              value={data.actualStartDate ? format(data.actualStartDate, "yyyy-MM-dd") : ""}
                              onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value) : undefined
                                updateMilestone(deliverable.id, milestone.name, { actualStartDate: date })
                              }}
                              className="w-36 h-8"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="date"
                              value={data.actualEndDate ? format(data.actualEndDate, "yyyy-MM-dd") : ""}
                              onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value) : undefined
                                updateMilestone(deliverable.id, milestone.name, { actualEndDate: date })
                              }}
                              className="w-36 h-8"
                            />
                          </td>
                          <td className="py-3 px-4">
                            {startVariance !== null ? (
                              <Badge variant={getVarianceStatus(startVariance)} className="text-xs">
                                {startVariance > 0
                                  ? `+${startVariance}d`
                                  : startVariance === 0
                                    ? "On time"
                                    : `${startVariance}d`}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {endVariance !== null ? (
                              <Badge variant={getVarianceStatus(endVariance)} className="text-xs">
                                {endVariance > 0
                                  ? `+${endVariance}d`
                                  : endVariance === 0
                                    ? "On time"
                                    : `${endVariance}d`}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
