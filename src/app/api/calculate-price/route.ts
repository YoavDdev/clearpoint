import { NextResponse } from 'next/server';

const PLANS = {
  Basic: { cost: 79.17, price: 115 },
  Standard: { cost: 99.84, price: 140 },
  Pro: { cost: 120.51, price: 165 },
  ProPlus: { cost: 141.18, price: 185 }, // Pro +1 Extra
};

const EXTRA_CAMERA_PRICE = 63;
const INSTALLATION_FEE = 100;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get('plan') as keyof typeof PLANS;
  const extraCameras = parseInt(searchParams.get('extraCameras') || '0');

  if (!plan || !PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const base = PLANS[plan];
  const monthlyPrice = base.price + extraCameras * EXTRA_CAMERA_PRICE;
  const oneTimeFee = INSTALLATION_FEE;
  const profit = monthlyPrice - base.cost - extraCameras * 20.67;

  return NextResponse.json({
    plan,
    basePrice: base.price,
    extraCameras,
    monthlyPrice,
    oneTimeFee,
    profit: Math.round(profit),
  });
}
