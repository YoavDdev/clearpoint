export type IssuerType = 'exempt' | 'authorized' | 'company';

export interface IssuerSnapshot {
  brand_name: string;
  issuer_type: IssuerType;
  vat_rate: number;
  currency: string;
  communication_email?: string | null;
  vat_number?: string | null;
  address?: string | null;
  phone?: string | null;
}

function parseVatRate(value: string | undefined) {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  return 0;
}

export function getIssuerSnapshot(currency: string = 'ILS'): IssuerSnapshot {
  const brandName = process.env.NEXT_PUBLIC_ISSUER_BRAND_NAME || 'ClearPoint';
  const issuerType = (process.env.ISSUER_TYPE as IssuerType) || 'exempt';
  const vatRate = parseVatRate(process.env.ISSUER_VAT_RATE);

  return {
    brand_name: brandName,
    issuer_type: issuerType,
    vat_rate: issuerType === 'exempt' ? 0 : vatRate,
    currency,
    communication_email: process.env.ISSUER_EMAIL || null,
    vat_number: process.env.ISSUER_VAT_NUMBER || null,
    address: process.env.ISSUER_ADDRESS || null,
    phone: process.env.ISSUER_PHONE || null,
  };
}
