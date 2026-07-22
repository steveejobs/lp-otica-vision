"use client";

import { Search, X, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogPageResult } from "@/lib/catalog/types";
import styles from "./catalog-search-bar.module.css";

interface CatalogSearchBarProps {
  onResultsUpdate?: (result: CatalogPageResult) => void;
}

export function CatalogSearchBar({ onResultsUpdate }: CatalogSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? searchParams.get("search") ?? "";
  
  const [value, setValue] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [, startTransition] = useTransition();

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state if URL changes externally
  useEffect(() => {
    const currentQ = searchParams.get("q") ?? searchParams.get("search") ?? "";
    setValue(currentQ);
  }, [searchParams]);

  const executeSearch = useCallback((searchTerm: string) => {
    // 1. Cancel previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    // 2. Build URL SearchParams preserving filters, resetting page to 1
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // Reset page number on search query change

    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
      params.delete("search");
    } else {
      params.delete("q");
      params.delete("search");
    }

    const newUrl = params.toString() ? `/catalogo?${params.toString()}` : "/catalogo";

    // Update browser URL without layout unmount
    window.history.replaceState(null, "", newUrl);

    if (!onResultsUpdate) {
      startTransition(() => {
        router.replace(newUrl, { scroll: false });
      });
      return;
    }

    setIsSearching(true);

    fetch(`/api/catalog/products?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CatalogPageResult | null) => {
        // Ignore stale out-of-order responses
        if (currentRequestId !== requestIdRef.current) return;
        setIsSearching(false);
        if (data && onResultsUpdate) {
          onResultsUpdate(data);
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setIsSearching(false);
      });
  }, [onResultsUpdate, router, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 200ms debounce during typing
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(newValue);
    }, 200);
  };

  const handleClear = () => {
    setValue("");
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    executeSearch("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} size={18} strokeWidth={1.5} />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Buscar por modelo, marca ou estilo..."
          className={styles.input}
          aria-label="Buscar modelos no catálogo"
        />
        {isSearching ? (
          <Loader2 className={styles.spinner} size={16} />
        ) : value ? (
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="Limpar busca"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
