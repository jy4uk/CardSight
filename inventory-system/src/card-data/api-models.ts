export interface PresaleInfo {
  isPresale: boolean;
  releasedOn: string | null;
  note: string | null;
}

export interface ExtendedData {
  name: string;
  displayName: string;
  value: string;
}

export interface Product {
  productId: number;
  name: string;
  cleanName: string;
  imageUrl: string;
  categoryId: number;
  groupId: number;
  url: string;
  modifiedOn: string;
  imageCount: number;
  presaleInfo: PresaleInfo;
  extendedData: ExtendedData[];
}

export interface ProductsResponse {
  totalItems: number;
  success: boolean;
  errors: string[];
  results: Product[];
}

export interface Price {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
  subTypeName: string;
}

export interface PricesResponse {
  success: boolean;
  errors: string[];
  results: Price[];
}

export interface Group {
  groupId: number;
  name: string;
  abbreviation: string;
  isSupplemental: boolean;
  publishedOn: string;
  modifiedOn: string;
  categoryId: number;
}

export interface GroupsResponse {
  totalItems: number;
  success: boolean;
  errors: string[];
  results: Group[];
}
