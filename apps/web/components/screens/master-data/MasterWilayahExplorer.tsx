"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPinned, Search } from "lucide-react";
import type { RegionLevel, RegionSummary } from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScreenState } from "@/components/ScreenState";
import {
  REGION_LEVEL_LABELS,
  REGION_LEVEL_ORDER,
  REGION_PARENT_LEVEL,
} from "./constants";
import { useMasterDataRegions } from "./useMasterDataRegions";

export function MasterWilayahExplorer() {
  const [level, setLevel] = useState<RegionLevel>("PROVINCE");
  const [path, setPath] = useState<RegionSummary[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const parentLevel = REGION_PARENT_LEVEL[level];
  const parent = parentLevel
    ? path.find((item) => item.level === parentLevel)
    : undefined;
  const regions = useMasterDataRegions({
    level,
    parentCode: parent?.code,
    search,
    page,
    pageSize: 50,
  });

  const currentLevelIndex = REGION_LEVEL_ORDER.indexOf(level);
  const nextLevel = REGION_LEVEL_ORDER[currentLevelIndex + 1];
  const totalPages = Math.max(
    1,
    Math.ceil(regions.meta.total / regions.meta.pageSize),
  );

  const changeLevel = (next: string | null) => {
    if (!next) return;
    setLevel(next as RegionLevel);
    setPath([]);
    setPage(1);
  };

  const openRegion = (region: RegionSummary) => {
    if (!nextLevel) return;
    setPath((current) => [
      ...current.filter(
        (item) => REGION_LEVEL_ORDER.indexOf(item.level) < currentLevelIndex,
      ),
      region,
    ]);
    setLevel(nextLevel);
    setSearch("");
    setPage(1);
  };

  const openBreadcrumb = (index: number) => {
    const selected = path[index];
    const selectedIndex = REGION_LEVEL_ORDER.indexOf(selected.level);
    setPath(path.slice(0, index + 1));
    setLevel(REGION_LEVEL_ORDER[selectedIndex + 1] || selected.level);
    setSearch("");
    setPage(1);
  };

  return (
    <Card>
      <CardHeader className="border-b border-border/70">
        <CardTitle className="flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-primary" aria-hidden="true" />
          Browser hierarki wilayah
        </CardTitle>
        <CardDescription>
          Telusuri snapshot lokal dari level administratif yang dipilih. Klik
          record untuk membuka children.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3 md:grid-cols-[minmax(12rem,0.4fr)_minmax(16rem,1fr)]">
          <label className="grid gap-1.5 text-xs font-semibold text-foreground">
            Mulai dari level
            <Select value={level} onValueChange={changeLevel}>
              <SelectTrigger
                aria-label="Pilih level wilayah"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGION_LEVEL_ORDER.map((option) => (
                  <SelectItem key={option} value={option}>
                    {REGION_LEVEL_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-foreground">
            Cari kode atau nama
            <span className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={`Cari ${REGION_LEVEL_LABELS[level].toLowerCase()}`}
                className="pl-9"
              />
            </span>
          </label>
        </div>

        {path.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-1 text-xs"
            aria-label="Breadcrumb wilayah"
          >
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setPath([]);
                setLevel("PROVINCE");
                setSearch("");
                setPage(1);
              }}
            >
              Semua wilayah
            </button>
            {path.map((item, index) => (
              <span
                key={`${item.level}-${item.code}`}
                className="flex items-center gap-1"
              >
                <ChevronRight
                  className="h-3 w-3 text-muted-foreground"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="max-w-[14rem] truncate text-left font-semibold text-primary hover:underline"
                  onClick={() => openBreadcrumb(index)}
                >
                  {item.name}
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] bg-muted/50 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {parent ? (
              <>
                Children dari{" "}
                <strong className="text-foreground">{parent.name}</strong>
              </>
            ) : (
              <>Menampilkan semua {REGION_LEVEL_LABELS[level].toLowerCase()}</>
            )}
          </span>
          <span className="font-semibold text-foreground">
            {regions.meta.total.toLocaleString("id-ID")} record
          </span>
        </div>

        {regions.error ? (
          <ScreenState
            kind="error"
            title="Wilayah belum tersedia"
            description={regions.error}
            compact
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void regions.refresh()}
              >
                Coba lagi
              </Button>
            }
          />
        ) : regions.loading ? (
          <ScreenState
            kind="loading"
            title="Memuat wilayah lokal"
            description="Data dibaca dari snapshot lokal."
          />
        ) : regions.items.length === 0 ? (
          <ScreenState
            kind="empty"
            title="Wilayah tidak ditemukan"
            description="Ubah level, parent, atau kata pencarian."
            compact
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.items.map((region) => (
                  <TableRow key={`${region.level}-${region.code}`}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {region.code}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{region.name}</div>
                      {region.bpsCode ? (
                        <div className="text-xs text-muted-foreground">
                          BPS {region.bpsCode}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {REGION_LEVEL_LABELS[region.level]}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-success">
                        Aktif lokal
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {nextLevel ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openRegion(region)}
                        >
                          Buka children <ChevronRight aria-hidden="true" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Level terakhir
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">
                Halaman {regions.meta.page} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || regions.loading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  <ChevronLeft aria-hidden="true" /> Sebelumnya
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || regions.loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Berikutnya <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
