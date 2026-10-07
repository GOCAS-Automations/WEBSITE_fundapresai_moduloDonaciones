import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "./cn";

type ContainerProps<T extends ElementType> = {
  as?: T;
  /** narrow: columna de lectura (~68 caracteres). */
  width?: "default" | "narrow";
} & ComponentPropsWithoutRef<T>;

export function Container<T extends ElementType = "div">({
  as,
  width = "default",
  className,
  ...rest
}: ContainerProps<T>) {
  const Tag = as ?? "div";
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-5 sm:px-6 lg:px-8",
        width === "narrow" ? "max-w-3xl" : "max-w-7xl",
        className,
      )}
      {...rest}
    />
  );
}
