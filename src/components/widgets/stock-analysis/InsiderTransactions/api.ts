// Client-side API functions for Insider Transactions widget

export interface ApiInsiderTransaction {
  date: string;
  ownerCik: string | null;
  ownerName: string;
  transactionDate: string;
  transactionCode: string; // "S" for Sell, "P" for Purchase/Buy
  transactionAmount: number | null; // Shares
  transactionPrice: number;
  transactionAcquiredDisposed: string; // "A" for Acquired/Buy, "D" for Disposed/Sell
  postTransactionAmount: number | null; // Shares owned after transaction
  secLink: string | null;
}

export interface ApiInsiderTransactionsResponse {
  success: boolean;
  symbol: string;
  Fundamentals: {
    InsiderTransactions: {
      [key: string]: ApiInsiderTransaction;
    };
  };
}

export interface ApiTransactionsResponse {
  success: boolean;
  data: ApiInsiderTransactionsResponse;
}

export interface Transaction {
  id: number;
  date: string;
  insider: string;
  title: string;
  type: 'Buy' | 'Sell';
  shares: number;
  price: number;
  value: number;
  sharesOwned: number;
  flash?: boolean;
}

// Decode HTML entities (e.g., &#39; -> ')
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Determine transaction type from API data
export function determineTransactionType(transaction: ApiInsiderTransaction): 'Buy' | 'Sell' {
  // Priority: transactionAcquiredDisposed > transactionCode
  if (transaction.transactionAcquiredDisposed === 'A') return 'Buy';
  if (transaction.transactionAcquiredDisposed === 'D') return 'Sell';
  
  // Fallback to transactionCode
  if (transaction.transactionCode === 'P') return 'Buy';
  if (transaction.transactionCode === 'S') return 'Sell';
  
  // Default to Sell if unclear
  return 'Sell';
}

// Transform API response to component format
export function transformApiTransactionsResponse(apiData: ApiInsiderTransactionsResponse): Transaction[] {
  const transactionsObject = apiData.Fundamentals?.InsiderTransactions;
  if (!transactionsObject) return [];
  
  // Convert object with numeric keys to array
  const transactionsArray = Object.entries(transactionsObject)
    .map(([key, transaction], index) => {
      const type = determineTransactionType(transaction);
      const shares = transaction.transactionAmount ?? 0;
      const price = transaction.transactionPrice ?? 0;
      const value = shares > 0 && price > 0 ? shares * price : 0;
      const sharesOwned = transaction.postTransactionAmount ?? 0;
      
      // Decode HTML entities in owner name
      const insiderName = decodeHtmlEntities(transaction.ownerName || 'Unknown');
      
      // Extract title from name if it contains common titles
      // If no title found, use "Insider" as default
      const title = extractTitleFromName(insiderName) || 'Insider';
      
      return {
        id: parseInt(key, 10) || index,
        date: transaction.date || transaction.transactionDate || '',
        insider: insiderName,
        title: title,
        type: type,
        shares: shares,
        price: price,
        value: value,
        sharesOwned: sharesOwned,
      };
    })
    // Sort by date descending (most recent first)
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  
  return transactionsArray;
}

// Helper to extract title from name (if name contains title)
function extractTitleFromName(name: string): string | null {
  // Common executive titles that might appear in names
  const titles = [
    'CEO', 'CFO', 'COO', 'CTO', 'President', 'Chairman', 'Vice President', 'VP',
    'SVP', 'EVP', 'Director', 'General Counsel', 'Secretary', 'Treasurer'
  ];
  
  // Check if name contains any title
  for (const title of titles) {
    if (name.toLowerCase().includes(title.toLowerCase())) {
      return title;
    }
  }
  
  return null;
}

// Fetch insider transactions data
export async function fetchInsiderTransactions(symbol: string): Promise<ApiTransactionsResponse | null> {
  try {
    console.log('📊 [Insider Transactions API] Fetching transactions for:', symbol);
    const response = await fetch('/api/pmt/get-insider-transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Insider Transactions API] HTTP error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    console.log('📊 [Insider Transactions API] Response received:', result);
    
    if (!result.success || !result.data) {
      console.error('❌ [Insider Transactions API] Unsuccessful response:', result);
      return null;
    }

    console.log('✅ [Insider Transactions API] Data extracted:', result.data);
    return result;
  } catch (error) {
    console.error('❌ [Insider Transactions API] Fetch error:', error);
    return null;
  }
}

