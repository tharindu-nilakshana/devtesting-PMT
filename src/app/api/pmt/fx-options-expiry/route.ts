import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📊 [FX Options Expiry API] Request received');
  
  try {
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [FX Options Expiry API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    console.log('📊 [FX Options Expiry API] Fetching data from upstream API');
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getFxOptionsExpiry', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(30000),
    });
    
    console.log('📊 [FX Options Expiry API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [FX Options Expiry API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text();
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
        data: null,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📊 [FX Options Expiry API] Received response');
    
    // Transform the API response to match our component's expected format
    const transformedData = transformApiResponse(responseData);
    
    return NextResponse.json({
      success: true,
      data: transformedData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [FX Options Expiry API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * Transform API response to match component's expected format
 */
function transformApiResponse(apiData: any) {
  // Extract current prices from lastprice_* fields
  const currentPrices: { [key: string]: number } = {};
  
  Object.keys(apiData).forEach((key) => {
    if (key.startsWith('lastprice_')) {
      const pair = key.replace('lastprice_', '');
      const price = parseFloat(apiData[key]);
      if (!isNaN(price)) {
        currentPrices[pair] = price;
      }
    }
  });
  
  // Transform Options array
  const expiryData = (apiData.Options || []).map((option: any) => {
    const pairs: { [key: string]: Array<{ strike: number; amount: string }> } = {};
    
    // List of currency pairs we support
    const supportedPairs = ['EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'USDCAD', 'AUDUSD'];
    
    supportedPairs.forEach((pair) => {
      const amountField = `${pair}_Amount`;
      const priceField = `${pair}_Price`;
      
      const amountsStr = option[amountField] || '';
      const pricesStr = option[priceField] || '';
      
      // Skip if both are empty
      if (!amountsStr && !pricesStr) {
        return;
      }
      
      // Parse HTML strings separated by <br /> or <br>
      // Handle both <br /> and <br> tags, and filter out empty strings
      const amounts = amountsStr
        .split(/<br\s*\/?>/i)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && s !== '<br />' && s !== '<br>');
      
      const prices = pricesStr
        .split(/<br\s*\/?>/i)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && s !== '<br />' && s !== '<br>');
      
      // Pair up prices and amounts by index
      const options: Array<{ strike: number; amount: string }> = [];
      const minLength = Math.min(amounts.length, prices.length);
      
      // Only pair up items where both price and amount exist
      for (let i = 0; i < minLength; i++) {
        const price = prices[i];
        const amount = amounts[i];
        
        if (price && amount) {
          const strikePrice = parseFloat(price);
          if (!isNaN(strikePrice) && amount.length > 0) {
            options.push({
              strike: strikePrice,
              amount: amount
            });
          }
        }
      }
      
      if (options.length > 0) {
        pairs[pair] = options;
      }
    });
    
    return {
      date: option.OptionDate && option.OptionDate !== '00/00' ? option.OptionDate : '',
      day: option.WeekDay || '',
      pairs: pairs
    };
  }); // Keep all days, even if empty (they'll show striped pattern in UI)
  
  return {
    expiryData,
    currentPrices
  };
}

