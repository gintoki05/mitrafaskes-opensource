import type {
  Icd10Summary,
  MasterDataIcd10Response,
  MasterDataListMeta,
} from '@mitrafaskes/shared';

export interface Icd10CatalogQuery {
  search: string;
  page: number;
  pageSize: number;
}

export type Icd10CatalogData = MasterDataIcd10Response;

export interface Icd10CatalogTableProps {
  items: Icd10Summary[];
  meta: MasterDataListMeta;
  loading: boolean;
  onPageChange: (page: number) => void;
}
