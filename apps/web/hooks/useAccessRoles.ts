"use client";

import { useCallback, useEffect, useReducer } from "react";
import type {
  AccountAuditItem,
  AccessRoleDetail,
  AccessRoleListResponse,
  PermissionCatalogResponse,
} from "@mitrafaskes/shared";
import { apiFetch } from "@/lib/auth";

type State = {
  roles: AccessRoleDetail[];
  permissions: PermissionCatalogResponse["items"];
  loading: boolean;
  error: string;
};
type Action =
  | { type: "loading" }
  | {
      type: "loaded";
      roles: AccessRoleDetail[];
      permissions: PermissionCatalogResponse["items"];
    }
  | { type: "failed"; error: string };
const initialState: State = {
  roles: [],
  permissions: [],
  loading: true,
  error: "",
};

function reducer(state: State, action: Action): State {
  if (action.type === "loading") return { ...state, loading: true, error: "" };
  if (action.type === "loaded")
    return {
      roles: action.roles,
      permissions: action.permissions,
      loading: false,
      error: "",
    };
  return { ...state, loading: false, error: action.error };
}

export function useAccessRoles() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const readError = useCallback(
    async (response: Response, fallback: string) => {
      try {
        const payload = (await response.json()) as { message?: string };
        return new Error(payload.message || fallback);
      } catch {
        return new Error(fallback);
      }
    },
    [],
  );
  const refresh = useCallback(async () => {
    dispatch({ type: "loading" });
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        apiFetch("/api/access-roles"),
        apiFetch("/api/access-roles/permissions"),
      ]);
      if (!rolesResponse.ok)
        throw await readError(rolesResponse, "Role tidak dapat dimuat.");
      if (!permissionsResponse.ok)
        throw await readError(
          permissionsResponse,
          "Permission tidak dapat dimuat.",
        );
      const roles = (await rolesResponse.json()) as AccessRoleListResponse;
      const permissions =
        (await permissionsResponse.json()) as PermissionCatalogResponse;
      dispatch({
        type: "loaded",
        roles: roles.items,
        permissions: permissions.items,
      });
    } catch (error) {
      dispatch({
        type: "failed",
        error:
          error instanceof Error ? error.message : "Role tidak dapat dimuat.",
      });
    }
  }, [readError]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const mutate = useCallback(
    async (path: string, method: "POST" | "PATCH", input: unknown) => {
      const response = await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok)
        throw await readError(response, "Perubahan role gagal.");
      return response.json() as Promise<AccessRoleDetail>;
    },
    [readError],
  );
  const create = useCallback(
    (input: unknown) => mutate("/api/access-roles", "POST", input),
    [mutate],
  );
  const update = useCallback(
    (id: string, input: unknown) =>
      mutate(`/api/access-roles/${id}`, "PATCH", input),
    [mutate],
  );
  const getAudit = useCallback(
    async (id: string): Promise<AccountAuditItem[]> => {
      const response = await apiFetch(`/api/access-roles/${id}/audit`);
      if (!response.ok)
        throw await readError(response, "Audit role tidak dapat dimuat.");
      return response.json() as Promise<AccountAuditItem[]>;
    },
    [readError],
  );
  return { ...state, refresh, create, update, getAudit };
}
