import React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-blue-600 text-white hover:bg-blue-700": variant === "default",
          "bg-gray-100 text-gray-900 hover:bg-gray-200": variant === "outline",
          "bg-green-600 text-white hover:bg-green-700": variant === "success",
          "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
          "bg-gray-900 text-white hover:bg-gray-800": variant === "secondary",
          "bg-transparent text-gray-900 hover:bg-gray-100": variant === "ghost",
          "text-gray-900 underline-offset-4 hover:underline": variant === "link",
        },
        {
          "h-10 px-4 py-2": size === "default",
          "h-9 rounded-md px-3": size === "sm",
          "h-11 rounded-md px-8": size === "lg",
          "h-8 w-8 rounded-md": size === "icon",
        },
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };
