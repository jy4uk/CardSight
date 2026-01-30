export interface GroupDB {
  group_id: number;
  name: string;
  abbreviation: string;
  is_supplemental: boolean;
  published_on: Date;
  modified_on: Date;
  category_id: number;
}

export interface ProductDB {
  product_id: number;
  name: string;
  clean_name: string;
  image_url: string;
  category_id: number;
  group_id: number;
  url: string;
  modified_on: Date;
  image_count: number;
  presale_is_presale: boolean;
  presale_released_on?: Date;
  presale_note?: string;
  extended_data?: any; // JSONB data
}

export interface PriceDB {
  id: number;
  product_id: number;
  low_price?: number;
  mid_price?: number;
  high_price?: number;
  market_price?: number;
  direct_low_price?: number;
  sub_type_name: string;
}
