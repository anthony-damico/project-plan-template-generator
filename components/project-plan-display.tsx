"use client"

import type { ProjectPlanDisplayProps } from "@/lib/generate-plan"
import { Button } from "@/components/ui/button"
import { Download, FileText, Copy, Check } from "@/components/icons"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

export function ProjectPlanDisplay({ plan }: ProjectPlanDisplayProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopyToClipboard = async () => {
    const planText = `
# ${plan.projectName}

## Project Overview
Start Date: ${new Date(plan.projectStartDate).toLocaleDateString()}
End Date: ${new Date(plan.projectEndDate).toLocaleDateString()}
Execution Mode: ${plan.executionMode}

## Setup & Implementations
${plan.setupMilestones
  ?.map(
    (milestone) => `
### ${milestone.name}
- Duration: ${milestone.durationWeeks} week(s)
- Start: ${new Date(milestone.plannedStartDate).toLocaleDateString()}
- End: ${new Date(milestone.plannedEndDate).toLocaleDateString()}
`,
  )
  .join("\n")}

## Databases
${plan.databases
  .map(
    (db) => `
### ${db.type}
Duration: ${db.totalDurationWeeks} weeks
Start: ${new Date(db.startDate).toLocaleDateString()}
End: ${new Date(db.endDate).toLocaleDateString()}

**Milestones:**
${db.milestones.map((m) => `- ${m.name} (${m.durationWeeks}w)`).join("\n")}
`,
  )
  .join("\n")}

## Products
${plan.products
  .map(
    (product) => `
### ${product.type}
Duration: ${product.totalDurationWeeks} weeks
Start: ${new Date(product.startDate).toLocaleDateString()}
End: ${new Date(product.endDate).toLocaleDateString()}

**Milestones:**
${product.milestones.map((m) => `- ${m.name} (${m.durationWeeks}w)`).join("\n")}
`,
  )
  .join("\n")}
    `.trim()

    try {
      await navigator.clipboard.writeText(planText)
      setCopied(true)
      toast({
        title: "Copied to clipboard",
        description: "Project plan has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadMarkdown = () => {
    // Implementation for downloading Markdown
  }

  const handleDownloadPDF = () => {
    // Implementation for downloading PDF
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Generated Project Plan</h2>
        <div className="flex gap-2">
          <Button onClick={handleCopyToClipboard} variant="outline" size="sm">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
          <Button onClick={handleDownloadMarkdown} variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Download Markdown
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {plan.setupMilestones && plan.setupMilestones.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Setup & Implementations</h3>
          <div className="space-y-4">
            {plan.setupMilestones.map((milestone, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{milestone.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(milestone.plannedStartDate).toLocaleDateString()} -{" "}
                    {new Date(milestone.plannedEndDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{milestone.durationWeeks} week(s)</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Databases Section */}
      {plan.databases.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Databases</h3>
          <div className="space-y-6">
            {plan.databases.map((db, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-semibold">{db.type}</h4>
                  <p className="text-sm text-muted-foreground">{db.totalDurationWeeks} weeks total</p>
                </div>
                <div className="space-y-2 pl-4">
                  {db.milestones.map((milestone, mIndex) => (
                    <div key={mIndex} className="flex items-center justify-between text-sm">
                      <span>{milestone.name}</span>
                      <span className="text-muted-foreground">{milestone.durationWeeks}w</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Section */}
      {plan.products.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Products</h3>
          <div className="space-y-6">
            {plan.products.map((product, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-semibold">{product.type}</h4>
                  <p className="text-sm text-muted-foreground">{product.totalDurationWeeks} weeks total</p>
                </div>
                <div className="space-y-2 pl-4">
                  {product.milestones.map((milestone, mIndex) => (
                    <div key={mIndex} className="flex items-center justify-between text-sm">
                      <span>{milestone.name}</span>
                      <span className="text-muted-foreground">{milestone.durationWeeks}w</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
