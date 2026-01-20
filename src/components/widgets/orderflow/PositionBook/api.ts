// Position Book API functions and types

export interface PositionBookData {
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

export interface PositionBookResponse {
  status: string;
  message: string;
  symbol: string;
  widgetTitle: string;
  close: number;
  avgLong: number;
  avgShort: number;
  dataLabels: PositionBookData['dataLabels'];
  dataSell: PositionBookData['dataSell'];
  dataBuy: PositionBookData['dataBuy'];
  count: number;
}

export async function fetchPositionBook(symbol: string, widgetTitle: string = 'positionbook'): Promise<PositionBookResponse> {
  try {
    const response = await fetch(`/api/orderflow/positionbook?symbol=${symbol}&widgetTitle=${widgetTitle}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch position book data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ [PositionBook] API error:', error);
    throw error;
  }
}

