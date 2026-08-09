"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  MasterDataDatasetStatus,
  MasterDataRefreshErrorResponse,
  MasterDataRefreshResponse,
} from "@mitrafaskes/shared";
import { apiFetch } from "@/lib/auth";

type RefreshPayload = Partial<
  MasterDataRefreshResponse & MasterDataRefreshErrorResponse
>;

const REFRESH_FALLBACK =
  "Refresh Master Wilayah gagal; snapshot lokal terakhir tetap digunakan.";
const GENERIC_REFRESH_MESSAGE =
  "Refresh Master Wilayah gagal; data lokal tidak diubah";

const readPayload = async (response: Response): Promise<RefreshPayload> => {
  try {
    return (await response.json()) as RefreshPayload;
  } catch {
    return {};
  }
};

const getMessage = (payload: RefreshPayload, fallback: string): string => {
  if (Array.isArray(payload.message)) return payload.message.join(" ");
  return payload.message || fallback;
};

const getErrorCode = (payload: RefreshPayload): string | undefined =>
  payload.code ||
  payload.importRun?.errorCode ||
  payload.dataset?.lastError?.code;

const getRefreshFailureMessage = (
  payload: RefreshPayload,
  response: Response,
): string => {
  const message = getMessage(payload, "");
  const code = getErrorCode(payload);
  const status = response.status;

  if (
    message &&
    message !== GENERIC_REFRESH_MESSAGE &&
    code !== "MASTER_DATA_REFRESH_FAILED"
  ) {
    return message;
  }

  if (status === 429) {
    return `${message || "Provider membatasi request refresh Master Wilayah."} Tunggu beberapa saat sebelum mencoba lagi. ${REFRESH_FALLBACK}`;
  }

  if (status === 502 || code === "MASTER_DATA_PROVIDER_HTTP_ERROR") {
    return `${message || "Provider Master Wilayah tidak merespons dengan benar."} Periksa status provider atau coba lagi nanti. ${REFRESH_FALLBACK}`;
  }

  if (status === 504 || code === "MASTER_DATA_PROVIDER_TIMEOUT") {
    return `${message || "Provider Master Wilayah melewati batas waktu."} Periksa koneksi provider atau coba lagi nanti. ${REFRESH_FALLBACK}`;
  }

  if (status >= 500) {
    const context = code
      ? ` (kode ${code}, HTTP ${status})`
      : ` (HTTP ${status})`;
    return `${message || "API tidak dapat menyelesaikan refresh Master Wilayah."}${context} Import gagal sudah dicatat; periksa log API dan konfigurasi provider sebelum mencoba lagi. ${REFRESH_FALLBACK}`;
  }

  if (status > 0) {
    return `${message || "Refresh Master Wilayah ditolak oleh API"} (HTTP ${status}). ${REFRESH_FALLBACK}`;
  }

  return message || REFRESH_FALLBACK;
};

const getCaughtRefreshMessage = (error: unknown): string => {
  if (error instanceof TypeError) {
    return `API Master Data tidak dapat dihubungi. Pastikan backend berjalan dan coba lagi. ${REFRESH_FALLBACK}`;
  }

  return error instanceof Error ? error.message : REFRESH_FALLBACK;
};

const mergeDataset = (
  current: MasterDataDatasetStatus[],
  next?: MasterDataDatasetStatus,
) =>
  next
    ? current.map((dataset) =>
        dataset.domain === next.domain ? next : dataset,
      )
    : current;

export function useMasterDataDatasets() {
  const [datasets, setDatasets] = useState<MasterDataDatasetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await apiFetch("/api/master-data/datasets", { signal });
    const payload = await readPayload(response);
    if (!response.ok) {
      throw new Error(
        getMessage(payload, "Status Master Data tidak dapat dimuat."),
      );
    }
    return payload as unknown as MasterDataDatasetStatus[];
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDatasets(await load());
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      )
        return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Status Master Data tidak dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [load]);

  const refreshWilayah = useCallback(async () => {
    setRefreshing(true);
    setActionError("");
    try {
      const response = await apiFetch("/api/master-data/regions/refresh", {
        method: "POST",
      });
      const payload = await readPayload(response);
      if (payload.dataset) {
        setDatasets((current) => mergeDataset(current, payload.dataset));
      }

      if (!response.ok) {
        throw new Error(getRefreshFailureMessage(payload, response));
      }
    } catch (requestError) {
      const message = getCaughtRefreshMessage(requestError);
      setActionError(message);
      throw new Error(message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setDatasets(next);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Status Master Data tidak dapat dimuat.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [load]);

  return {
    datasets,
    loading,
    refreshing,
    error,
    actionError,
    refresh,
    refreshWilayah,
  };
}
