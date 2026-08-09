import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({
  className,
  "aria-label": ariaLabel = "Pagination",
  ...props
}: ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label={ariaLabel}
      data-slot="pagination"
      className={cn("flex justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn(
        "m-0 flex list-none flex-wrap items-center justify-center gap-1 p-0",
        className,
      )}
      {...props}
    />
  );
}

function PaginationItem({
  className,
  ...props
}: ComponentProps<"li">) {
  return (
    <li
      data-slot="pagination-item"
      className={cn("", className)}
      {...props}
    />
  );
}

type PaginationLinkProps = ComponentProps<typeof Button> & {
  isActive?: boolean;
};

function PaginationLink({
  className,
  isActive = false,
  variant = isActive ? "outline" : "ghost",
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      className={cn("min-w-9", className)}
      {...props}
    />
  );
}

type PaginationPreviousProps = PaginationLinkProps & {
  label?: ReactNode;
  showLabel?: boolean;
};

function PaginationPrevious({
  className,
  children,
  label = "Sebelumnya",
  showLabel = true,
  size = showLabel ? "sm" : "icon-sm",
  ...props
}: PaginationPreviousProps) {
  return (
    <PaginationLink
      aria-label="Halaman sebelumnya"
      size={size}
      className={cn(showLabel ? "gap-1 pl-2.5" : "", className)}
      {...props}
    >
      <ChevronLeft aria-hidden="true" />
      {children ?? (showLabel ? <span>{label}</span> : null)}
    </PaginationLink>
  );
}

type PaginationNextProps = PaginationLinkProps & {
  label?: ReactNode;
  showLabel?: boolean;
};

function PaginationNext({
  className,
  children,
  label = "Berikutnya",
  showLabel = true,
  size = showLabel ? "sm" : "icon-sm",
  ...props
}: PaginationNextProps) {
  return (
    <PaginationLink
      aria-label="Halaman berikutnya"
      size={size}
      className={cn(showLabel ? "gap-1 pr-2.5" : "", className)}
      {...props}
    >
      {children ?? (showLabel ? <span>{label}</span> : null)}
      <ChevronRight aria-hidden="true" />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      role="presentation"
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" aria-hidden="true" />
      <span className="sr-only">Lebih banyak halaman</span>
    </span>
  );
}

type PaginationControlProps = Omit<
  ComponentProps<typeof Pagination>,
  "children"
> & {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  showLabels?: boolean;
  previousLabel?: ReactNode;
  nextLabel?: ReactNode;
};

type PaginationItemValue = number | "ellipsis-left" | "ellipsis-right";

function getPaginationItems(
  page: number,
  totalPages: number,
): PaginationItemValue[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (page >= totalPages - 3) {
    return [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-left",
    page - 1,
    page,
    page + 1,
    "ellipsis-right",
    totalPages,
  ];
}

function PaginationControl({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  showLabels = true,
  previousLabel = "Sebelumnya",
  nextLabel = "Berikutnya",
  ...props
}: PaginationControlProps) {
  const normalizedTotalPages = Math.max(1, Math.floor(totalPages));
  const currentPage = Math.min(
    normalizedTotalPages,
    Math.max(1, Math.floor(page)),
  );
  const items = getPaginationItems(currentPage, normalizedTotalPages);
  const changePage = (nextPage: number) => {
    if (
      disabled ||
      nextPage < 1 ||
      nextPage > normalizedTotalPages ||
      nextPage === currentPage
    ) {
      return;
    }
    onPageChange(nextPage);
  };

  return (
    <Pagination {...props}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            label={previousLabel}
            showLabel={showLabels}
            disabled={disabled || currentPage <= 1}
            onClick={() => changePage(currentPage - 1)}
          />
        </PaginationItem>
        {items.map((item) => (
          <PaginationItem key={item}>
            {typeof item === "number" ? (
              <PaginationLink
                isActive={item === currentPage}
                disabled={disabled}
                aria-label={`Ke halaman ${item}`}
                onClick={() => changePage(item)}
              >
                {item}
              </PaginationLink>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            label={nextLabel}
            showLabel={showLabels}
            disabled={disabled || currentPage >= normalizedTotalPages}
            onClick={() => changePage(currentPage + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationControl,
};
