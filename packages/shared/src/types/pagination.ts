export interface ListMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedListResponse<T> {
  items: T[];
  meta: ListMeta;
}
