import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItem = Math.min(validPage * pageSize, totalItems);

  // Generate visible page numbers
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (validPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (validPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', validPage - 1, validPage, validPage + 1, '...', totalPages];
  };

  if (totalItems <= 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#e2e4e9] dark:border-[#3a3839] bg-white dark:bg-[#1e1b1c] text-xs select-none ${className}`}
    >
      {/* Showing X of Y */}
      <div className="flex items-center gap-3 text-[#58595b] dark:text-[#cdc4c5]">
        <span>
          Showing <span className="font-bold text-[#191c1e] dark:text-white font-mono">{startItem}</span> to{' '}
          <span className="font-bold text-[#191c1e] dark:text-white font-mono">{endItem}</span> of{' '}
          <span className="font-bold text-[#191c1e] dark:text-white font-mono">{totalItems.toLocaleString()}</span> entries
        </span>

        {onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-[#e2e4e9] dark:border-[#3a3839]">
            <span className="text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 rounded-lg border border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-[#191c1e] dark:text-white text-xs focus:ring-1 focus:ring-[#bb0013] focus:outline-none"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={validPage === 1}
          aria-label="First page"
          className="p-1.5 rounded-lg border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] hover:text-[#191c1e] dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Prev Page */}
        <button
          onClick={() => onPageChange(validPage - 1)}
          disabled={validPage === 1}
          aria-label="Previous page"
          className="p-1.5 rounded-lg border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] hover:text-[#191c1e] dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-[#58595b] dark:text-[#cdc4c5] text-xs">
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === validPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#bb0013] text-white shadow-xs'
                    : 'text-[#58595b] dark:text-[#cdc4c5] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] hover:text-[#191c1e] dark:hover:text-white border border-transparent'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(validPage + 1)}
          disabled={validPage === totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-lg border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] hover:text-[#191c1e] dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={validPage === totalPages}
          aria-label="Last page"
          className="p-1.5 rounded-lg border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] hover:text-[#191c1e] dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
