// Orderbook API functions and types
// Note: Orderbook uses the same endpoint as PositionBook but with different widgetTitle

export interface OrderbookData {
  status: string;
  message: string;
  symbol: string;
  widgetTitle: string;
  close: number;
  avgLong: number;
  avgShort: number;
  dataLabels: Array<{ label: string; vline?: string; lineposition?: string; thickness?: string; color?: string; labelhalign?: string; labelposition?: string; dashed?: string }>;
  dataSell: Array<{ value: string }>;
  dataBuy: Array<{ value: string }>;
  count: number;
}

export interface OrderbookResponse {
  status: string;
  message: string;
  symbol: string;
  widgetTitle: string;
  close: number;
  avgLong: number;
  avgShort: number;
  dataLabels: OrderbookData['dataLabels'];
  dataSell: OrderbookData['dataSell'];
  dataBuy: OrderbookData['dataBuy'];
  count: number;
}

export async function fetchOrderbook(symbol: string, widgetTitle: string = 'orderbook'): Promise<OrderbookResponse> {
  try {
    const response = await fetch(`/api/orderflow/orderbook?symbol=${symbol}&widgetTitle=${widgetTitle}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch orderbook data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ [Orderbook] API error:', error);
    throw error;
  }
}

