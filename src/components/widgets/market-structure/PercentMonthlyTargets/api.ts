/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PercentMonthlyTargetsDataItem {
    open: number;
    close: number;
}

export interface PercentMonthlyTargetsResponse {
    status: string;
    message: string;
    symbol: string;
    sdate: string;
    data: PercentMonthlyTargetsDataItem[];
    count: number;
}

export interface PercentMonthlyTargetsRequest {
    sdate: string; // Date in format YYYY-MM-DD
    symbol: string; // e.g., "EURUSD"
}

/**
 * Fetch percent monthly targets data from the API
 */
export async function fetchPercentMonthlyTargets(
    request: PercentMonthlyTargetsRequest
): Promise<PercentMonthlyTargetsResponse> {
    // Build URL with query parameters
    const url = new URL('/api/pmt/getPercentMonthlyTargets', window.location.origin);
    url.searchParams.set('sdate', request.sdate);
    url.searchParams.set('symbol', request.symbol);

    // Use internal API proxy which handles authentication via cookies
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch percent monthly targets: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
}
