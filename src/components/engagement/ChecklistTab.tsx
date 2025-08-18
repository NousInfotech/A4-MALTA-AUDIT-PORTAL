// @ts-nocheck
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useChecklist } from "@/hooks/useChecklist"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { EnhancedLoader } from "@/components/ui/enhanced-loader"

interface ChecklistTabProps {
  engagementId: string
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({ engagementId }) => {
  const { groupedChecklist, loading, updateItem } = useChecklist(engagementId)

  const [textValues, setTextValues] = useState<Record<string, string>>({})
  const [itemLoadingStates, setItemLoadingStates] = useState<Record<string, boolean>>({})
  const debouncedTimers = useRef<Record<string, number>>({})

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debouncedTimers.current).forEach(clearTimeout)
    }
  }, [])

  const handleFieldUpdate = async (itemId: string, field: string, value: any) => {
    setItemLoadingStates((prev) => ({ ...prev, [itemId]: true }))

    try {
      // Find the item in groupedChecklist
      const allItems = Object.values(groupedChecklist).flatMap((cat) => Object.values(cat).flat())
      const item = allItems.find((i) => i._id === itemId)

      const updateData: any = { [field]: value }

      if (field === "completed") {
        if (value === true) {
          // If checking a date field, set dateValue now
          if (item?.fieldType === "date" && !item.dateValue) {
            updateData.dateValue = new Date().toISOString()
          }
        } else {
          // If unchecking, clear any field value
          if (item?.fieldType === "text") {
            updateData.textValue = ""
            // clear local state too
            setTextValues((tv) => ({ ...tv, [itemId]: "" }))
          }
          if (item?.fieldType === "date") {
            updateData.dateValue = null
          }
          if (item?.fieldType === "select") {
            updateData.selectValue = ""
          }
        }
      }

      await updateItem(itemId, updateData)
    } finally {
      setItemLoadingStates((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  // Debounced handler for textValue
  const handleTextChange = (itemId: string, newText: string) => {
    // Update UI immediately
    setTextValues((tv) => ({ ...tv, [itemId]: newText }))

    // Clear any existing timer
    if (debouncedTimers.current[itemId]) {
      clearTimeout(debouncedTimers.current[itemId])
    }

    // Set new timer (500ms delay)
    debouncedTimers.current[itemId] = window.setTimeout(() => {
      handleFieldUpdate(itemId, "textValue", newText)
    }, 500)
  }

  const renderField = (item: any) => {
    const disabled = !item.completed
    const isLoading = itemLoadingStates[item._id]

    const fieldVariants = {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
    }

    switch (item.fieldType) {
      case "text":
        return (
          <motion.div
            className="flex items-center space-x-3"
            variants={fieldVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="relative">
              <Checkbox
                checked={item.completed || false}
                onCheckedChange={(checked) => handleFieldUpdate(item._id, "completed", checked)}
                className="mt-1"
                disabled={isLoading}
              />
              
            </div>
            <div className="flex gap-4 space-y-2 flex-1">
              <Label className="text-sm font-medium">{item.description}</Label>
              <Input
                placeholder="Enter text..."
                value={textValues[item._id] ?? item.textValue ?? ""}
                onChange={(e) => handleTextChange(item._id, e.target.value)}
                disabled={disabled || isLoading}
                className="w-full"
              />
            </div>
          </motion.div>
        )

      case "date":
        return (
          <motion.div
            className="flex items-center space-x-3"
            variants={fieldVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="relative">
              <Checkbox
                checked={item.completed || false}
                onCheckedChange={(checked) => handleFieldUpdate(item._id, "completed", checked)}
                className="mt-1"
                disabled={isLoading}
              />
              
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Label className="text-sm font-medium">{item.description}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={disabled || isLoading}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      (disabled || isLoading) && "opacity-50 cursor-not-allowed",
                      !item.dateValue && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {item.dateValue ? format(new Date(item.dateValue), "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={item.dateValue ? new Date(item.dateValue) : undefined}
                    onSelect={(date) => handleFieldUpdate(item._id, "dateValue", date?.toISOString())}
                    disabled={disabled || isLoading}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </motion.div>
        )

      case "select":
        return (
          <motion.div
            className="flex items-center space-x-3"
            variants={fieldVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="relative">
              <Checkbox
                checked={item.completed || false}
                onCheckedChange={(checked) => handleFieldUpdate(item._id, "completed", checked)}
                className="mt-1"
                disabled={isLoading}
              />
              
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Label className="text-sm font-medium">{item.description}</Label>
              <Select
                value={item.selectValue || ""}
                onValueChange={(value) => handleFieldUpdate(item._id, "selectValue", value)}
                disabled={disabled || isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {(item.selectOptions || []).map((opt: string) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )

      default:
        return (
          <motion.div
            className="flex items-center space-x-3"
            variants={fieldVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="relative">
              <Checkbox
                checked={item.completed || false}
                onCheckedChange={(checked) => handleFieldUpdate(item._id, "completed", checked)}
                disabled={isLoading}
              />
              
            </div>
            <Label className="text-sm font-medium">{item.description}</Label>
          </motion.div>
        )
    }
  }

  // Compute overall completion stats
  const getCompletionStats = () => {
    const all = Object.values(groupedChecklist).flatMap((cat) => Object.values(cat).flat())
    const done = all.filter((i) => i.completed).length
    const total = all.length
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader variant="pulse" size="lg" text="Loading checklist..." />
      </div>
    )
  }

  const { done, total, pct } = getCompletionStats()

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="initial" animate="animate">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Audit Procedures Checklist</CardTitle>
                <CardDescription>Complete audit checklist to track progress through all phases</CardDescription>
              </div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {done}/{total} ({pct}%)
                </Badge>
              </motion.div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <AnimatePresence>
              {Object.entries(groupedChecklist).map(([category, subcats], categoryIndex) => (
                <motion.div
                  key={category}
                  className="space-y-6"
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: categoryIndex * 0.1 }}
                >
                  <motion.div
                    className="bg-primary text-primary-foreground p-3 font-semibold rounded"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {category}
                  </motion.div>
                  {Object.entries(subcats).map(([subcat, items], subcatIndex) => (
                    <motion.div
                      key={subcat}
                      className="space-y-4 ml-4"
                      variants={itemVariants}
                      transition={{ delay: categoryIndex * 0.1 + subcatIndex * 0.05 }}
                    >
                      <div className="font-medium text-foreground border-b pb-2">{subcat}</div>
                      <div className="space-y-4 ml-4">
                        {items.map((item, itemIndex) => (
                          <motion.div
                            key={item._id}
                            className="py-2"
                            variants={itemVariants}
                            transition={{
                              delay: categoryIndex * 0.1 + subcatIndex * 0.05 + itemIndex * 0.02,
                            }}
                          >
                            {renderField(item)}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ))}
            </AnimatePresence>
            {Object.keys(groupedChecklist).length === 0 && (
              <motion.div className="text-center py-12 text-muted-foreground" variants={itemVariants}>
                <p>No checklist items found.</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
