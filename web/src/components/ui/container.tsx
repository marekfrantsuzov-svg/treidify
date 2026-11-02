import { cn } from "@/lib/cn";

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1312px] px-5 sm:px-6 lg:px-8", className)} {...props} />;
}
