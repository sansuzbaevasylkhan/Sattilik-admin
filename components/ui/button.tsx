import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#0066FF] text-white hover:bg-[#0052CC] shadow-[0_4px_14px_rgba(0,102,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,102,255,0.35)]",
        outline:
          "border-[#0066FF] bg-transparent text-[#0066FF] hover:bg-[#0066FF] hover:text-white transition-colors",
        secondary:
          "bg-[#FFC800] text-black border-[#D4AF37] hover:bg-[#FFD700] transition-all",
        ghost:
          "text-black/70 hover:bg-black/5 hover:text-black transition-all",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 transition-colors",
        link: "text-[#0066FF] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 px-4 py-2 gap-2",
        xs: "h-7 px-2 text-xs rounded-md",
        sm: "h-8 px-3 text-sm rounded-md",
        lg: "h-12 px-6 text-base rounded-xl",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : ButtonPrimitive
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
