// Local edit: removed the built-in aria-label="Loading"; callers pass text from en.ts.
import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
