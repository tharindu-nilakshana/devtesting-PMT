/* eslint-disable @typescript-eslint/no-explicit-any */
// Types for risk sentiment data - matching the original component exactly
export interface RiskSentimentRecord {
  id: number;
  timestamp: string;
  sentiment_value: number;
  sentiment_name: string;
  current_region: string;
  description: string;
  // Performance fields from API
  perfEquities?: string;
  perfBonds?: string;
  perfSafeHavens?: string;
  perfRiskCurrencies?: string;
  perfVolatility?: string;
  // Legacy fields for backward compatibility
  time?: string;
  value?: number;
  name?: string;
  region?: string;
  // Additional fields
  isFallbackData?: boolean;
}

export interface RiskSentimentResponse {
  success: boolean;
  data?: {
    allRecords?: RiskSentimentRecord[];
    latestRecord?: RiskSentimentRecord;
    records?: RiskSentimentRecord[];
  };
  error?: string;
}

// Helper function to get sentiment color based on value
export function getSentimentColor(sentimentValue: number): string {
  if (sentimentValue >= 35) return '#004D00'; // Strong Risk-On (dark green)
  if (sentimentValue >= 0) return '#1A8C1A';  // Weak Risk-On (medium green)
  if (sentimentValue >= -35) return '#FF9800'; // Neutral (orange)
  if (sentimentValue >= -70) return '#CC6600'; // Weak Risk-Off (brown-orange)
  return '#800000'; // Strong Risk-Off (dark red)
}

// Helper function to get sentiment icon name for Lucide React
export function getSentimentIcon(sentimentValue: number): string {
  if (sentimentValue >= 35) return 'TriangleAlert'; // Strong Risk-On
  if (sentimentValue >= 0) return 'TriangleAlert';  // Weak Risk-On
  if (sentimentValue >= -35) return 'Scale'; // Neutral
  if (sentimentValue >= -70) return 'TrendingDown'; // Weak Risk-Off
  return 'TrendingDown'; // Strong Risk-Off
}

// Helper function to get sentiment description
export function getSentimentDescription(sentimentName: string): string {
  const descriptions: Record<string, string> = {
    'Strong Risk-On': 'Decisive shift to risk-on: Strong bid across equities, high-beta FX, commodities. Risk appetite at peak levels with broad-based flows into growth assets.',
    'Weak Risk-On': 'Risk appetite improving gradually: Flows returning to equities, oil, AUD. Early signs of risk-on sentiment emerging.',
    'Neutral': 'Market stabilizing in neutral territory: Cross-asset flows muted, mixed signals across risk assets. Awaiting directional catalyst.',
    'Weak Risk-Off': 'Early risk aversion emerging: Gradual rotation into JPY, Gold, Bonds. Defensive positioning increasing.',
    'Strong Risk-Off': 'Decisive shift to risk-off: Broad-based flows into safe havens, JPY, USD, Gold. Risk aversion at peak levels.'
  };
  
  return descriptions[sentimentName] || 'Market sentiment data unavailable';
}

// Helper function to determine active market session
export function getActiveMarketSession(): string {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // Market session logic based on UTC hours
  if (utcHour >= 0 && utcHour < 8) {
    return 'Asia';
  } else if (utcHour >= 8 && utcHour < 16) {
    return 'Europe';
  } else {
    return 'US';
  }
}

// Client-side function that calls the Next.js API route
export async function getRiskSentimentData(
  widgetType: 'risk_indicator' | 'risk_sentiment' = 'risk_sentiment',
  currentRegion?: string
): Promise<RiskSentimentResponse | null> {
  try {
    // Call our Next.js API route which handles authentication
    const response = await fetch('/api/utilities/risk-sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        widgetType,
        currentRegion
      }),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });


    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.log('🔐 [RiskSentiment] Authentication required - user may need to log in');
        throw new Error('Authentication required. Please log in to view risk sentiment data.');
      }
      
      if (response.status === 408) {
        console.log('⏰ [RiskSentiment] Request timeout');
        throw new Error('Request timeout - please try again');
      }
      
      if (response.status === 503) {
        console.log('🌐 [RiskSentiment] Service unavailable');
        throw new Error('External service temporarily unavailable - please try again later');
      }
      
      return null;
    }

    const result = await response.json();
    console.log('📊 [RiskSentiment] API Result:', {
      success: result.success,
      hasData: !!result.data,
      dataKeys: Object.keys(result.data || {}),
      hasAllRecords: !!result.data?.allRecords,
      allRecordsLength: result.data?.allRecords?.length || 0,
      hasLatestRecord: !!result.data?.latestRecord,
      sampleRecord: result.data?.allRecords?.[0] || 'No records'
    });
    
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('Risk Sentiment data fetch timed out after 15 seconds');
    }
    return null;
  }
}

// Client-side function for data processing
export async function getRiskSentimentDataForClient(
  widgetType: 'risk_indicator' | 'risk_sentiment' = 'risk_sentiment',
  currentRegion?: string
): Promise<RiskSentimentRecord[] | null> {
  const result = await getRiskSentimentData(widgetType, currentRegion);
  
  if (!result || !result.success) {
    return null;
  }

  // Handle different possible response structures
  let allRecords: RiskSentimentRecord[] = [];
  
  // Check if data has nested structure (status, data)
  if ((result.data as any)?.status && (result.data as any)?.data) {
    // Data is nested under result.data.data
    const nestedData = (result.data as any).data;
    if (nestedData.allRecords) {
      allRecords = nestedData.allRecords;
    } else if (Array.isArray(nestedData)) {
      allRecords = nestedData;
    } else if (nestedData.records) {
      allRecords = nestedData.records;
    }
  } else if (result.data?.allRecords) {
    allRecords = result.data.allRecords;
  } else if (Array.isArray(result.data)) {
    allRecords = result.data;
  } else if ((result.data as any)?.data && Array.isArray((result.data as any).data)) {
    allRecords = (result.data as any).data;
  } else if (result.data?.records && Array.isArray(result.data.records)) {
    allRecords = result.data.records;
  }
  
  // Transform the data to match expected field names
  const transformedRecords = allRecords.map((record: any) => ({
    id: record.ID || record.id || 0,
    timestamp: record.DateTime || record.UTCDateTime || record.timestamp || new Date().toISOString(),
    sentiment_value: record.Percentage || record.sentiment_value || 0,
    sentiment_name: record.Sentiment || record.sentiment_name || 'Unknown',
    current_region: record.Region || record.current_region || 'Global',
    description: record.Sentiment || record.description || 'No description', // Use Sentiment as description for now
    // Performance fields
    perfEquities: record.PerfEquities || record.perfEquities,
    perfBonds: record.PerfBonds || record.perfBonds,
    perfSafeHavens: record.PerfSafeHavens || record.perfSafeHavens,
    perfRiskCurrencies: record.PerfRiskCurrencies || record.perfRiskCurrencies,
    perfVolatility: record.PerfVolatility || record.perfVolatility,
    // Legacy fields for backward compatibility
    time: record.DateTime || record.time,
    value: record.Percentage || record.value,
    name: record.Sentiment || record.name,
    region: record.Region || record.region
  }));
  
  // Return empty array if no data available (no fallback data)
  if (transformedRecords.length === 0) {
    console.log('📊 [RiskSentiment] No data available from API');
    return [];
  }
  
  
  return transformedRecords as RiskSentimentRecord[];
}

// Chart-related interfaces and functions
export interface RiskChartInstance {
  root?: unknown;
  chart?: unknown;
  axisDataItem?: unknown;
  title?: unknown;
  svgElement?: SVGElement | null;
  needleElement?: Element | null;
  titleElement?: Element | null;
  amChartInstance?: unknown;
}

export interface RiskBarChartInstance {
  chart?: unknown;
  dataProvider?: unknown;
  svgElement?: SVGElement | null;
  barsContainer?: Element | null;
  amChartInstance?: unknown;
}

// Initialize global chart storage
if (typeof window !== 'undefined') {
  (window as any).riskChartInstances = (window as any).riskChartInstances || {};
  (window as any).riskBarChartInstances = (window as any).riskBarChartInstances || {};
}

/**
 * Creates an enhanced radar chart using SVG with professional styling
 * Replicates the amCharts gauge with gradient, proper needle, and labels
 */
export function createEnhancedRadarChart(
  containerId: string,
  wgid: string,
  latestRecord: RiskSentimentRecord
): unknown {
  try {
    
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.error('❌ [Enhanced SVG] Container not found:', containerId);
      return null;
    }

    // ALWAYS CLEAR COMPLETELY - No chart reuse to eliminate unwanted elements
    container.innerHTML = '';

    // Create SVG with enhanced styling matching amCharts implementation (responsive size)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 400 300');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.background = 'transparent';

    // Create definitions for gradients and filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Create main gauge gradient (red to green)
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', `gauge-gradient-${wgid}`);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');
    
    // Enhanced gradient with more color stops for smooth transition
    const gradientStops = [
      { offset: '0%', color: '#3A0000' },    // Dark red (Strong Risk Off)
      { offset: '15%', color: '#800000' },   // Red 
      { offset: '35%', color: '#CC6600' },   // Brown-orange (Weak Risk Off)
      { offset: '50%', color: '#FF9800' },   // Orange (Neutral)
      { offset: '75%', color: '#1A8C1A' },   // Light green (Weak Risk On)
      { offset: '100%', color: '#79FF0D' }   // Bright green (Strong Risk On)
    ];
    
    gradientStops.forEach(stop => {
      const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopElement.setAttribute('offset', stop.offset);
      stopElement.setAttribute('stop-color', stop.color);
      gradient.appendChild(stopElement);
    });
    
    defs.appendChild(gradient);

    // Create shadow filter for needle
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    shadow.setAttribute('id', `needle-shadow-${wgid}`);
    shadow.setAttribute('x', '-50%');
    shadow.setAttribute('y', '-50%');
    shadow.setAttribute('width', '200%');
    shadow.setAttribute('height', '200%');
    
    const dropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    dropShadow.setAttribute('dx', '2');
    dropShadow.setAttribute('dy', '2');
    dropShadow.setAttribute('stdDeviation', '3');
    dropShadow.setAttribute('flood-color', '#000000');
    dropShadow.setAttribute('flood-opacity', '0.5');
    shadow.appendChild(dropShadow);
    
    defs.appendChild(shadow);
    svg.appendChild(defs);

    // Create main gauge arc with enhanced thickness (bigger size)
    const gaugeRadius = 120;
    const strokeWidth = 25;
    const centerX = 200;
    const centerY = 200;
    
    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const startAngle = Math.PI; // 180 degrees (bottom left)
    const endAngle = 0; // 0 degrees (bottom right)
    
    const x1 = centerX + gaugeRadius * Math.cos(startAngle);
    const y1 = centerY + gaugeRadius * Math.sin(startAngle);
    const x2 = centerX + gaugeRadius * Math.cos(endAngle);
    const y2 = centerY + gaugeRadius * Math.sin(endAngle);
    
    arc.setAttribute('d', `M ${x1} ${y1} A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${x2} ${y2}`);
    arc.setAttribute('stroke', `url(#gauge-gradient-${wgid})`);
    arc.setAttribute('stroke-width', strokeWidth.toString());
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke-linecap', 'round');
    svg.appendChild(arc);

    // NO TICK MARKS OR VALUE LABELS - Complete removal to eliminate unwanted needles

    // Create enhanced needle with proper clock hand style (bigger size) - Correct coordinate calculation
    const needleValue = Math.max(-70, Math.min(70, latestRecord.sentiment_value));
    const needleAngle = Math.PI - ((needleValue + 70) / 140) * Math.PI;
    const needleLength = gaugeRadius - 20;
    const needleWidth = 8;
    
    // Calculate needle tip position - corrected for proper positioning
    const needleTipX = centerX + needleLength * Math.cos(needleAngle);
    const needleTipY = centerY + needleLength * Math.sin(needleAngle);
    
    // Create needle shape (triangle pointing to value)
    const needleBaseOffset = needleWidth / 2;
    const baseAngle1 = needleAngle + Math.PI / 2;
    const baseAngle2 = needleAngle - Math.PI / 2;
    
    const base1X = centerX + needleBaseOffset * Math.cos(baseAngle1);
    const base1Y = centerY + needleBaseOffset * Math.sin(baseAngle1);
    const base2X = centerX + needleBaseOffset * Math.cos(baseAngle2);
    const base2Y = centerY + needleBaseOffset * Math.sin(baseAngle2);
    
    const needle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    needle.setAttribute('points', `${needleTipX},${needleTipY} ${base1X},${base1Y} ${base2X},${base2Y}`);
    needle.setAttribute('fill', '#ffffff');
    needle.setAttribute('stroke', '#333333');
    needle.setAttribute('stroke-width', '1');
    needle.setAttribute('filter', `url(#needle-shadow-${wgid})`);
    needle.setAttribute('class', 'needle');
    svg.appendChild(needle);

    // Create center pin with enhanced styling (bigger)
    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', centerX.toString());
    centerCircle.setAttribute('cy', centerY.toString());
    centerCircle.setAttribute('r', '12');
    centerCircle.setAttribute('fill', '#ffffff');
    centerCircle.setAttribute('stroke', '#333333');
    centerCircle.setAttribute('stroke-width', '3');
    centerCircle.setAttribute('filter', `url(#needle-shadow-${wgid})`);
    svg.appendChild(centerCircle);

    // Add enhanced title with sentiment info (bigger positioning)
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', centerX.toString());
    title.setAttribute('y', '270');
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('fill', '#ffffff');
    title.setAttribute('font-size', '20');
    title.setAttribute('font-weight', 'bold');
    title.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');
    title.setAttribute('class', 'gauge-title');
    title.textContent = latestRecord.sentiment_name;
    svg.appendChild(title);
    
    // Add percentage value (bigger)
    const percentage = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    percentage.setAttribute('x', centerX.toString());
    percentage.setAttribute('y', '290');
    percentage.setAttribute('text-anchor', 'middle');
    percentage.setAttribute('fill', '#cccccc');
    percentage.setAttribute('font-size', '16');
    percentage.setAttribute('font-weight', '600');
    percentage.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');
    percentage.setAttribute('class', 'gauge-percentage');
    percentage.textContent = `${latestRecord.sentiment_value.toFixed(2)}%`;
    svg.appendChild(percentage);

    // Add manually positioned threshold labels to avoid overlap
    const labelPositions = [
      { text: 'Strong Risk Off', x: 80, y: 210 },      // Left side (-70)
      { text: 'Weak Risk Off', x: 140, y: 170 },       // Left-center (-35)
      { text: 'Neutral', x: 200, y: 75 },              // Top center (0)
      { text: 'Weak Risk On', x: 260, y: 170 },        // Right-center (35)
      { text: 'Strong Risk On', x: 320, y: 210 }       // Right side (70)
    ];

    labelPositions.forEach((label) => {
      const thresholdLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      thresholdLabel.setAttribute('x', label.x.toString());
      thresholdLabel.setAttribute('y', label.y.toString());
      thresholdLabel.setAttribute('text-anchor', 'middle');
      thresholdLabel.setAttribute('fill', '#cccccc');
      thresholdLabel.setAttribute('font-size', '11');
      thresholdLabel.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');
      thresholdLabel.setAttribute('font-weight', '500');
      thresholdLabel.textContent = label.text;
      svg.appendChild(thresholdLabel);
    });

    container.appendChild(svg);

    console.log('✅ [Enhanced SVG] Chart created successfully');
    return { svg, container };
  } catch (error) {
    console.error('❌ [Enhanced SVG] Error creating chart:', error);
    return null;
  }
}

/**
 * Creates a simple radar chart using CSS and HTML (legacy fallback)
 */
export function createRadarChart(
  containerId: string,
  wgid: string,
  latestRecord: RiskSentimentRecord
): unknown {
  try {
    
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.error('❌ [createRadarChart] Container not found:', containerId);
      console.error('🔍 [createRadarChart] Available elements with similar IDs:', {
        allElements: Array.from(document.querySelectorAll('[id*="radar-chart"]')).map(el => el.id),
        allElementsWithId: Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter(id => id.includes('chart'))
      });
      return null;
    }

    // ALWAYS CLEAR COMPLETELY - No chart reuse to eliminate unwanted elements
    container.innerHTML = '';

    // Create SVG-based gauge chart with professional styling
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 400 250');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.background = 'transparent';

    // Create gradient definition for the gauge arc (red to green)
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', `gauge-gradient-${wgid}`);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');
    
    // Add gradient stops (red to green)
    const stops = [
      { offset: '0%', color: '#3A0000' },    // Dark red
      { offset: '25%', color: '#800000' },   // Red
      { offset: '50%', color: '#FF9800' },   // Orange
      { offset: '75%', color: '#1A8C1A' },   // Light green
      { offset: '100%', color: '#79FF0D' }   // Bright green
    ];
    
    stops.forEach(stop => {
      const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopElement.setAttribute('offset', stop.offset);
      stopElement.setAttribute('stop-color', stop.color);
      gradient.appendChild(stopElement);
    });
    
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Create main gauge arc with gradient
    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arc.setAttribute('d', 'M 50 180 A 100 100 0 0 1 350 180');
    arc.setAttribute('stroke', `url(#gauge-gradient-${wgid})`);
    arc.setAttribute('stroke-width', '20');
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke-linecap', 'round');
    svg.appendChild(arc);

    // NO TICK MARKS - Complete removal to eliminate unwanted needles

    // Create needle (clock hand style) - Correct coordinate calculation for semicircle gauge
    // Map -70 (bottom-left) to +70 (bottom-right) across 180° to 0° (top-center at 90°)
    const needleAngle = 180 - ((latestRecord.sentiment_value + 70) / 140) * 180;
    const needleLength = 80; // Longer needle for better visibility
    const needleX = 200 + needleLength * Math.cos(needleAngle * Math.PI / 180);
    const needleY = 180 - needleLength * Math.sin(needleAngle * Math.PI / 180);
    
    // Debug needle calculation
    console.log('🔍 [Needle Calc] Sentiment:', {
      value: latestRecord.sentiment_value,
      name: latestRecord.sentiment_name,
      needleAngle: needleAngle.toFixed(1) + '°',
      needleX: needleX.toFixed(1),
      needleY: needleY.toFixed(1),
      horizontal: needleX < 200 ? 'LEFT' : needleX > 200 ? 'RIGHT' : 'CENTER',
      vertical: needleY < 180 ? 'ABOVE' : needleY > 180 ? 'BELOW' : 'CENTER'
    });
    
    // Create needle line
    const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    needle.setAttribute('x1', '200');
    needle.setAttribute('y1', '180');
    needle.setAttribute('x2', needleX.toString());
    needle.setAttribute('y2', needleY.toString());
    needle.setAttribute('stroke', '#ffffff');
    needle.setAttribute('stroke-width', '5');
    needle.setAttribute('stroke-linecap', 'round');
    needle.setAttribute('class', 'needle');
    svg.appendChild(needle);

    // Add center pin (larger and more prominent)
    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', '200');
    centerCircle.setAttribute('cy', '180');
    centerCircle.setAttribute('r', '10');
    centerCircle.setAttribute('fill', '#ffffff');
    centerCircle.setAttribute('stroke', '#000000');
    centerCircle.setAttribute('stroke-width', '3');
    svg.appendChild(centerCircle);

    // Create properly spaced arc of labels to avoid overlap
    const arcLabels = [
      { text: 'Strong Risk Off', x: 60, y: 175 },      // Far left (-70) - adjusted
      { text: 'Weak Risk Off', x: 120, y: 105 },      // Left-center (-35) - moved up
      { text: 'Neutral', x: 200, y: 60 },             // Top center (0) - highest point
      { text: 'Weak Risk On', x: 280, y: 105 },       // Right-center (35) - moved up
      { text: 'Strong Risk On', x: 340, y: 175 }      // Far right (70) - adjusted
    ];

    arcLabels.forEach(label => {
      const labelElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelElement.setAttribute('x', label.x.toString());
      labelElement.setAttribute('y', label.y.toString());
      labelElement.setAttribute('text-anchor', 'middle');
      labelElement.setAttribute('fill', '#ffffff');
      labelElement.setAttribute('font-size', '12');
      labelElement.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');
      labelElement.setAttribute('font-weight', '500');
      labelElement.textContent = label.text;
      svg.appendChild(labelElement);
    });

    // Add value labels
    const valueLabels = [
      { value: -70, x: 50, y: 200 },
      { value: -35, x: 100, y: 130 },
      { value: 0, x: 200, y: 80 },
      { value: 35, x: 300, y: 130 },
      { value: 70, x: 350, y: 200 }
    ];

    valueLabels.forEach(label => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', label.x.toString());
      text.setAttribute('y', label.y.toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#ffffff');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');
      text.setAttribute('font-weight', 'bold');
      text.textContent = label.value.toString();
      svg.appendChild(text);
    });

    // Add title (sentiment name and percentage)
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', '200');
    title.setAttribute('y', '230');
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('fill', '#ffffff');
    title.setAttribute('font-size', '18');
    title.setAttribute('font-weight', 'bold');
    title.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');
    title.setAttribute('class', 'gauge-title');
    title.textContent = `${latestRecord.sentiment_name}: ${latestRecord.sentiment_value}%`;
    svg.appendChild(title);

    container.appendChild(svg);

    console.log('✅ [createRadarChart] Chart created successfully');
    return { svg, container };
  } catch (error) {
    console.error('❌ [createRadarChart] Error creating chart:', error);
    return null;
  }
}

/**
 * Creates a simple bar chart using CSS and HTML
 */
export function createBarChart(
  containerId: string,
  wgid: string,
  data: RiskSentimentRecord[]
): unknown {
  try {
    console.log('📊 [createBarChart] Creating bar chart:', { containerId, wgid, dataLength: data.length });
    
    const container = document.getElementById(containerId);
    console.log('🔍 [createBarChart] Container lookup result:', { containerId, container, containerExists: !!container });
    
    if (!container) {
      console.error('❌ [createBarChart] Container not found:', containerId);
      console.error('🔍 [createBarChart] Available elements with similar IDs:', {
        allElements: Array.from(document.querySelectorAll('[id*="bar-chart"]')).map(el => el.id),
        allElementsWithId: Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter(id => id.includes('chart'))
      });
      return null;
    }

    // Check if chart already exists to prevent clearing
    const existingChart = container.querySelector('.bars-container');
    if (existingChart) {
      console.log('🔄 [createBarChart] Chart already exists, updating instead of recreating');
      // Update the existing chart bars instead of recreating
      existingChart.innerHTML = '';
      
      // Create new bars with enhanced styling
      data.slice(-10).forEach((record, index) => {
        const bar = document.createElement('div');
        const height = Math.abs(record.sentiment_value) * 1.5;
        const color = getSentimentColor(record.sentiment_value);
        
        bar.style.cssText = `
          flex: 1;
          height: ${Math.max(height, 8)}px;
          background: linear-gradient(to top, ${color}dd, ${color}aa);
          border-radius: 3px 3px 0 0;
          min-height: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          position: relative;
          overflow: hidden;
        `;
        
        bar.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s both`;
        bar.title = `${record.sentiment_name}: ${record.sentiment_value}%`;
        existingChart.appendChild(bar);
      });
      
      return { barsContainer: existingChart };
    }

    // Clear existing content only if no chart exists
    container.innerHTML = '';

    // Create bars container with professional styling
    const barsContainer = document.createElement('div');
    barsContainer.className = 'bars-container';
    barsContainer.style.cssText = `
      display: flex;
      align-items: end;
      height: 100%;
      gap: 2px;
      padding: 8px;
      background: transparent;
      border-radius: 4px;
      position: relative;
    `;

    // Create bars for each data point with enhanced styling
    data.slice(-10).forEach((record, index) => {
      const bar = document.createElement('div');
      const height = Math.abs(record.sentiment_value) * 1.5; // Better scaling
      const color = getSentimentColor(record.sentiment_value);
      
      // Create gradient for the bar
      const gradientId = `bar-gradient-${wgid}-${index}`;
      const defs = container.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      if (!container.querySelector('defs')) {
        container.appendChild(defs);
      }
      
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('id', gradientId);
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '0%');
      gradient.setAttribute('x2', '0%');
      gradient.setAttribute('y2', '100%');
      
      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', color);
      stop1.setAttribute('stop-opacity', '0.9');
      
      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', color);
      stop2.setAttribute('stop-opacity', '0.6');
      
      bar.style.cssText = `
        flex: 1;
        height: ${Math.max(height, 4)}px;
        background: ${color};
        border-radius: 2px 2px 0 0;
        min-height: 4px;
        transition: all 0.3s ease;
        position: relative;
        opacity: 0.8;
      `;
      
      bar.title = `${record.sentiment_name}: ${record.sentiment_value}%`;
      barsContainer.appendChild(bar);
    });

    container.appendChild(barsContainer);

    console.log('✅ [createBarChart] Bar chart created successfully');
    return { barsContainer };
  } catch (error) {
    console.error('❌ [createBarChart] Error creating bar chart:', error);
    return null;
  }
}

/**
 * Updates an existing radar chart with new data
 */
/**
 * Updates enhanced radar chart with new data
 */
function updateEnhancedRadarChart(svg: SVGElement, latestRecord: RiskSentimentRecord): void {
  try {
    
    // Update needle position with enhanced styling
    const needle = svg.querySelector('.needle') as SVGPolygonElement;
    if (needle) {
      const needleValue = Math.max(-70, Math.min(70, latestRecord.sentiment_value));
      const needleAngle = Math.PI - ((needleValue + 70) / 140) * Math.PI;
      const needleLength = 100; // gaugeRadius - 20 (updated for responsive chart)
      const needleWidth = 8;
      const centerX = 200;
      const centerY = 200;
      
      // Calculate new needle tip position
      const needleTipX = centerX + needleLength * Math.cos(needleAngle);
      const needleTipY = centerY + needleLength * Math.sin(needleAngle);
      
      // Calculate new needle base positions
      const needleBaseOffset = needleWidth / 2;
      const baseAngle1 = needleAngle + Math.PI / 2;
      const baseAngle2 = needleAngle - Math.PI / 2;
      
      const base1X = centerX + needleBaseOffset * Math.cos(baseAngle1);
      const base1Y = centerY + needleBaseOffset * Math.sin(baseAngle1);
      const base2X = centerX + needleBaseOffset * Math.cos(baseAngle2);
      const base2Y = centerY + needleBaseOffset * Math.sin(baseAngle2);
      
      // Update needle polygon points
      needle.setAttribute('points', `${needleTipX},${needleTipY} ${base1X},${base1Y} ${base2X},${base2Y}`);
    }

    // Update title
    const title = svg.querySelector('.gauge-title');
    if (title) {
      title.textContent = latestRecord.sentiment_name;
    }
    
    // Update percentage
    const percentage = svg.querySelector('.gauge-percentage');
    if (percentage) {
      percentage.textContent = `${latestRecord.sentiment_value.toFixed(2)}%`;
    }

    console.log('✅ [Enhanced SVG] Chart updated successfully');
  } catch (error) {
    console.error('❌ [Enhanced SVG] Error updating chart:', error);
  }
}

export function updateRadarChart(wgid: string, latestRecord: RiskSentimentRecord): void {
  try {
    
    // Check if chart container exists
    const container = document.getElementById(`radar-chart-${wgid}`);
    if (!container) {
      console.warn('⚠️ [updateRadarChart] Chart container not found, creating new chart');
      return;
    }
    
    // Check if chart exists
    const existingChart = container.querySelector('svg');
    if (!existingChart) {
      console.warn('⚠️ [updateRadarChart] Chart not found, creating new chart');
      return;
    }
    
    // Check if this is an enhanced chart and update accordingly
    const enhancedNeedle = existingChart.querySelector('.needle[points]') as SVGPolygonElement;
    if (enhancedNeedle) {
      console.log('🔄 [updateRadarChart] Detected enhanced chart, using enhanced update');
      updateEnhancedRadarChart(existingChart, latestRecord);
      return;
    }

    // Find the needle element and update its position (legacy)
    const needle = container.querySelector('.needle');
    if (needle) {
      const needleAngle = 180 - ((latestRecord.sentiment_value + 70) / 140) * 180;
      const needleLength = 70; // Match the creation length
      const needleX = 200 + needleLength * Math.cos(needleAngle * Math.PI / 180);
      const needleY = 180 - needleLength * Math.sin(needleAngle * Math.PI / 180);
      
      needle.setAttribute('x2', needleX.toString());
      needle.setAttribute('y2', needleY.toString());
      console.log('✅ [updateRadarChart] Needle updated successfully');
    } else {
      console.warn('⚠️ [updateRadarChart] Needle element not found');
    }

    // Update title
    const title = container.querySelector('.gauge-title');
    if (title) {
      title.textContent = `${latestRecord.sentiment_name}: ${latestRecord.sentiment_value}%`;
      console.log('✅ [updateRadarChart] Title updated successfully');
    } else {
      console.warn('⚠️ [updateRadarChart] Title element not found');
    }

    console.log('✅ [updateRadarChart] Chart updated successfully');
  } catch (error) {
    console.error('❌ [updateRadarChart] Error updating chart:', error);
  }
}

/**
 * Updates an existing bar chart with new data
 */
export function updateBarChart(wgid: string, data: RiskSentimentRecord[]): void {
  try {
    console.log('🔄 [updateBarChart] Updating bar chart:', { wgid, dataLength: data.length });
    
    const container = document.getElementById(`bar-chart-${wgid}`);
    if (!container) {
      console.warn('⚠️ [updateBarChart] Chart container not found');
      return;
    }

    const barsContainer = container.querySelector('.bars-container');
    if (!barsContainer) {
      console.warn('⚠️ [updateBarChart] Bars container not found');
      return;
    }

    // Clear existing bars
    barsContainer.innerHTML = '';

    // Create new bars with enhanced styling
    data.slice(-10).forEach((record, index) => {
      const bar = document.createElement('div');
      const height = Math.abs(record.sentiment_value) * 1.5; // Match creation scaling
      const color = getSentimentColor(record.sentiment_value);
      
      bar.style.cssText = `
        flex: 1;
        height: ${Math.max(height, 8)}px;
        background: linear-gradient(to top, ${color}dd, ${color}aa);
        border-radius: 3px 3px 0 0;
        min-height: 8px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        position: relative;
        overflow: hidden;
      `;
      
      // Add subtle animation
      bar.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s both`;
      
      bar.title = `${record.sentiment_name}: ${record.sentiment_value}%`;
      barsContainer.appendChild(bar);
    });

    console.log('✅ [updateBarChart] Bar chart updated successfully');
  } catch (error) {
    console.error('❌ [updateBarChart] Error updating bar chart:', error);
  }
}

/**
 * Disposes of chart instances
 */
export function disposeCharts(wgid: string): void {
  try {
    console.log('🧹 [disposeCharts] Disposing charts for widget:', wgid);
    
    // Clear radar chart
    const radarContainer = document.getElementById(`radar-chart-${wgid}`);
    if (radarContainer) {
      radarContainer.innerHTML = '';
    }

    // Clear bar chart
    const barContainer = document.getElementById(`bar-chart-${wgid}`);
    if (barContainer) {
      barContainer.innerHTML = '';
    }

    console.log('✅ [disposeCharts] Charts disposed successfully');
  } catch (error) {
    console.error('❌ [disposeCharts] Error disposing charts:', error);
  }
}

// Hybrid chart interfaces and functions
export interface HybridChartOptions {
  wgid?: string;
  useAmCharts?: boolean;
  darkMode?: boolean;
  containerId?: string;
}

export interface HybridChartInstance {
  type: 'svg' | 'amcharts' | 'lightweight';
  instance: unknown;
  containerId: string;
}

/**
 * Create hybrid radar chart (gauge) - can use SVG or AmCharts
 */
export async function createHybridRadarChart(
  wgid: string,
  latestRecord: RiskSentimentRecord,
  options: HybridChartOptions = {}
): Promise<HybridChartInstance> {
  const { useAmCharts = false, darkMode = false, containerId = `chart${wgid}` } = options;
  
  console.log('🎯 [HybridCharts] Creating radar chart:', { wgid, useAmCharts, darkMode });
  
  try {
    if (useAmCharts && typeof window !== 'undefined') {
      // Check AmCharts availability asynchronously
      const amChartsAvailable = await isAmChartsAvailable();
      
      console.log('🔍 [HybridCharts] AmCharts availability check:', {
        useAmCharts,
        isAmChartsAvailable: amChartsAvailable
      });
      
      if (amChartsAvailable) {
        // Use AmCharts implementation
        console.log('📊 [HybridCharts] Using AmCharts implementation', {
          useAmCharts,
          isAmChartsAvailable: amChartsAvailable,
          containerId
        });
        
        const amChartInstance = await createAmChart({
          wgid,
          latestRecord,
          darkMode,
          containerId
        });
        
        if (amChartInstance && (amChartInstance as any).type === 'amcharts') {
          console.log('✅ [HybridCharts] AmCharts instance created successfully:', amChartInstance);
          return {
            type: 'amcharts',
            instance: (amChartInstance as any).instance,
            containerId
          };
        }
        
        // If creator responded with an SVG fallback wrapper, use it as SVG
        if (amChartInstance && (amChartInstance as any).type === 'svg') {
          console.log('🎨 [HybridCharts] AmCharts creator returned SVG fallback, using Enhanced SVG');
          return {
            type: 'svg',
            instance: (amChartInstance as any).instance,
            containerId
          };
        }
      } else {
        // AmCharts not available, fallback to Enhanced SVG
        console.log('🎨 [HybridCharts] AmCharts not available, using Enhanced SVG fallback', {
          useAmCharts,
          isAmChartsAvailable: amChartsAvailable,
          reason: 'AmCharts modules not properly loaded'
        });
      }
    }
    
    // Fallback to Enhanced SVG implementation
    console.log('🎨 [HybridCharts] Using Enhanced SVG implementation', {
      useAmCharts,
      reason: !useAmCharts ? 'useAmCharts=false' : 
              'AmCharts not available or failed to load'
    });
    
    const svgInstance = createEnhancedRadarChart(containerId, wgid, latestRecord);
    console.log('🔍 [HybridCharts] Enhanced SVG instance created:', svgInstance);
    
    return {
      type: 'svg',
      instance: svgInstance,
      containerId
    };
    
  } catch (error) {
    console.error('❌ [HybridCharts] Error creating hybrid radar chart:', error);
    
    // Final fallback to Enhanced SVG
    const svgInstance = createEnhancedRadarChart(containerId, wgid, latestRecord);
    console.log('🔍 [HybridCharts] Final fallback Enhanced SVG instance created:', svgInstance);
    
    return {
      type: 'svg',
      instance: svgInstance,
      containerId
    };
  }
}

/**
 * Create hybrid bar chart - uses TradingView Lightweight Charts
 */
export async function createHybridBarChart(
  wgid: string,
  data: RiskSentimentRecord[],
  options: HybridChartOptions = {}
): Promise<HybridChartInstance> {
  const { darkMode = false } = options;
  
  console.log('📊 [HybridCharts] Creating bar chart with Lightweight Charts:', { wgid, darkMode });
  
  try {
    // Use TradingView Lightweight Charts for bar chart
    const { createChart } = await import('lightweight-charts');
    
    const container = document.getElementById(`bar-chart-${wgid}`);
    if (!container) {
      console.error('❌ [LightweightCharts] Container not found:', `bar-chart-${wgid}`);
      return {
        type: 'svg',
        instance: null,
        containerId: `bar-chart-${wgid}`
      };
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Create chart
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: darkMode ? '#000000' : '#ffffff' },
        textColor: darkMode ? '#ffffff' : '#000000',
      },
      grid: {
        vertLines: { color: darkMode ? '#333333' : '#e1e1e1' },
        horzLines: { color: darkMode ? '#333333' : '#e1e1e1' },
      },
      rightPriceScale: {
        borderColor: darkMode ? '#333333' : '#e1e1e1',
      },
      timeScale: {
        borderColor: darkMode ? '#333333' : '#e1e1e1',
        timeVisible: true,
        secondsVisible: false,
      },
    });
    
    // Create histogram series for sentiment values
    const histogramSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    
    // Transform data for Lightweight Charts
    const chartData = data.slice(-20).map((record, index) => ({
      time: ((Date.now() / 1000) - (data.length - index) * 3600) as any, // Convert to timestamp
      value: Math.abs(record.sentiment_value),
      color: getSentimentColor(record.sentiment_value),
    }));
    
    // Set data
    histogramSeries.setData(chartData);
    
    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === container) {
          chart.applyOptions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    
    resizeObserver.observe(container);
    
    console.log('✅ [LightweightCharts] Bar chart created successfully');
    return {
      type: 'lightweight',
      instance: { chart, series: histogramSeries, resizeObserver },
      containerId: `bar-chart-${wgid}`
    };
    
  } catch (error) {
    console.error('❌ [LightweightCharts] Error creating bar chart:', error);
    
    // Fallback to SVG
    const svgInstance = createBarChart(`bar-chart-${wgid}`, wgid, data);
    
    return {
      type: 'svg',
      instance: svgInstance,
      containerId: `bar-chart-${wgid}`
    };
  }
}

/**
 * Update hybrid radar chart
 */
export function updateHybridRadarChart(
  chartInstance: HybridChartInstance,
  latestRecord: RiskSentimentRecord
): void {
  try {
    console.log('🔄 [HybridCharts] Updating hybrid radar chart:', {
      type: chartInstance.type,
      containerId: chartInstance.containerId
    });
    
    if (chartInstance.type === 'amcharts') {
      // Update AmCharts instance
      updateAmChart(chartInstance.instance, latestRecord);
    } else {
      // Update SVG instance - derive wgid from containerId 'radar-chart-<wgid>'
      const containerId = chartInstance.containerId;
      const wgid = containerId.startsWith('radar-chart-')
        ? containerId.substring('radar-chart-'.length)
        : containerId;
      updateRadarChart(wgid, latestRecord);
    }
    
    console.log('✅ [HybridCharts] Hybrid radar chart updated successfully');
  } catch (error) {
    console.error('❌ [HybridCharts] Error updating hybrid radar chart:', error);
  }
}

/**
 * Update hybrid bar chart
 */
export function updateHybridBarChart(
  chartInstance: HybridChartInstance,
  data: RiskSentimentRecord[]
): void {
  try {
    console.log('🔄 [HybridCharts] Updating hybrid bar chart:', {
      type: chartInstance.type,
      containerId: chartInstance.containerId
    });
    
    if (chartInstance.type === 'lightweight') {
      // Update Lightweight Charts instance
      const instance = chartInstance.instance as any;
      if (instance && instance.series) {
        const chartData = data.slice(-20).map((record, index) => ({
          time: ((Date.now() / 1000) - (data.length - index) * 3600) as any,
          value: Math.abs(record.sentiment_value),
          color: getSentimentColor(record.sentiment_value),
        }));
        
        instance.series.setData(chartData);
        console.log('✅ [LightweightCharts] Bar chart updated successfully');
      }
    } else if (chartInstance.type === 'amcharts') {
      // AmCharts bar chart update will be implemented later
      console.log('⚠️ [HybridCharts] AmCharts bar chart update not yet implemented');
    } else {
      // Update SVG instance
      updateBarChart(chartInstance.containerId.replace('bar-chart-', ''), data);
    }
    
    console.log('✅ [HybridCharts] Hybrid bar chart updated successfully');
  } catch (error) {
    console.error('❌ [HybridCharts] Error updating hybrid bar chart:', error);
  }
}

/**
 * Dispose hybrid charts
 */
export function disposeHybridCharts(chartInstance: HybridChartInstance): void {
  try {
    console.log('🧹 [HybridCharts] Disposing hybrid chart:', {
      type: chartInstance.type,
      containerId: chartInstance.containerId
    });
    
    if (chartInstance.type === 'amcharts') {
      // Dispose AmCharts instance
      disposeAmChart(chartInstance.instance);
    } else if (chartInstance.type === 'lightweight') {
      // Dispose Lightweight Charts instance
      const instance = chartInstance.instance as any;
      if (instance) {
        if (instance.resizeObserver) {
          instance.resizeObserver.disconnect();
        }
        if (instance.chart) {
          try {
            // Check if chart is still valid before removing
            if (instance.chart.series) {
              instance.chart.remove();
            }
          } catch (disposeError) {
            console.warn('⚠️ [LightweightCharts] Chart already disposed or invalid:', disposeError);
          }
        }
        console.log('✅ [LightweightCharts] Chart disposed successfully');
      }
    } else {
      // Dispose SVG instance - compute wgid from known prefixes
      const id = chartInstance.containerId;
      let wgid = id;
      if (id.startsWith('radar-chart-')) {
        wgid = id.substring('radar-chart-'.length);
      } else if (id.startsWith('bar-chart-')) {
        wgid = id.substring('bar-chart-'.length);
      }
      disposeCharts(wgid);
    }
    
    console.log('✅ [HybridCharts] Hybrid chart disposed successfully');
  } catch (error) {
    console.error('❌ [HybridCharts] Error disposing hybrid chart:', error);
  }
}

/**
 * Check if AmCharts is available (async version)
 */
export async function isAmChartsAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') {
    console.log('🔍 [AmCharts] Not available on server side');
    return false;
  }
  
  try {
    // Try to dynamically import AmCharts modules
    const am5Module = await import('@amcharts/amcharts5');
    const am5radarModule = await import('@amcharts/amcharts5/radar');
    const am5xyModule = await import('@amcharts/amcharts5/xy');
    
    const am5 = am5Module.default || am5Module;
    const am5radar = am5radarModule.default || am5radarModule;
    const am5xy = am5xyModule.default || am5xyModule;
    
    console.log('🔍 [AmCharts] Dynamic availability check:', {
      am5: !!am5,
      am5radar: !!am5radar,
      am5xy: !!am5xy,
      allAvailable: !!(am5 && am5radar && am5xy)
    });
    
    return !!(am5 && am5radar && am5xy);
  } catch (_error) {
    console.log('🔍 [AmCharts] Availability check failed:', _error);
    return false;
  }
}

/**
 * Check if AmCharts is available (sync version for compatibility)
 */
export function isAmChartsAvailableSync(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    // Check if AmCharts is available in global scope
    return !!(window as any).am5;
  } catch {
    return false;
  }
}

/**
 * Get chart implementation info
 */
export function getChartImplementationInfo(): {
  amChartsAvailable: boolean;
  amChartsVersion: string;
} {
  return {
    amChartsAvailable: isAmChartsAvailableSync(),
    amChartsVersion: isAmChartsAvailableSync() ? 'Available' : 'Not Available',
  };
}

// Helper function to interpolate between hex colors
function interpolateHex(c1: string, c2: string, t: number): string {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);
  const r1 = (a >> 16) & 0xFF, g1 = (a >> 8) & 0xFF, b1 = a & 0xFF;
  const r2 = (b >> 16) & 0xFF, g2 = (b >> 8) & 0xFF, b2 = b & 0xFF;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b_ = Math.round(b1 + (b2 - b1) * t);
  return "#" + ((1<<24) | (r<<16) | (g<<8) | b_).toString(16).slice(1);
}

// AmCharts implementation for radar chart
async function createAmChart(options: {
  wgid: string;
  latestRecord: RiskSentimentRecord;
  darkMode: boolean;
  containerId: string;
}): Promise<unknown> {
  try {
    console.log('📊 [AmCharts] Creating AmCharts radar chart:', options);
    
    // Check if AmCharts is available
    const isAmChartsReady = await isAmChartsAvailable();
    if (!isAmChartsReady) {
      console.log('⚠️ [AmCharts] AmCharts not available, using enhanced SVG implementation');
      const svgInstance = createEnhancedRadarChart(options.containerId, options.wgid, options.latestRecord);
    return { type: 'svg', instance: svgInstance };
    }

    // Try to load AmCharts modules
    const am5Module = await import('@amcharts/amcharts5');
    const am5radarModule = await import('@amcharts/amcharts5/radar');
    const am5xyModule = await import('@amcharts/amcharts5/xy');
    const am5themesModule = await import('@amcharts/amcharts5/themes/Animated');

    const am5 = am5Module.default || am5Module;
    const am5radar = am5radarModule.default || am5radarModule;
    const am5xy = am5xyModule.default || am5xyModule;
    const am5themes_Animated = am5themesModule.default || am5themesModule;

    console.log('📊 [AmCharts] Modules loaded successfully, creating chart');

    const container = document.getElementById(options.containerId);
    if (!container) {
      throw new Error(`Container ${options.containerId} not found`);
    }

    // Check if there's already a root on this container and dispose it
    const existingRoot = (container as any)._am5Root;
    if (existingRoot) {
      console.log('🧹 [AmCharts] Disposing existing root before creating new one');
      try {
        existingRoot.dispose();
      } catch (e) {
        console.warn('⚠️ [AmCharts] Error disposing existing root:', e);
      }
    }

    // Create root
    const root = am5.Root.new(options.containerId);
    
    // Store reference to root on container for cleanup
    (container as any)._am5Root = root;
    
    // Set theme
    root.setThemes([am5themes_Animated.new(root)]);

    // Set font family (if supported)
    try {
      root.container.setAll({
        fontFamily: "Inter"
      } as any);
    } catch {
      console.log('⚠️ [AmCharts] Font family setting not supported');
    }
    
    // Create radar chart
    const chart = root.container.children.push(
      am5radar.RadarChart.new(root, {
        panX: false,
        panY: false,
        startAngle: 180,
        endAngle: 360
      })
    );

    // Create gradient stops for red to green transition
    const steps = 100;
    const gradientStops = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      gradientStops.push({
        offset: t,
        color: am5.color(interpolateHex("#3A0000", "#79FF0D", t))
      });
    }                  
    
    // Create axis renderer with gradient
    const axisRenderer = am5radar.AxisRendererCircular.new(root, {
      innerRadius: -40,
      strokeOpacity: 1,
      strokeWidth: 15,
      strokeGradient: am5.LinearGradient.new(root, {
        rotation: 0,
        stops: gradientStops           
      })
    });
    
    // Style ticks
    axisRenderer.ticks.template.setAll({
      strokeOpacity: 1,
      length: 10,
      strokeWidth: 2,
      stroke: am5.color(options.darkMode ? "#ffffff" : "#000000"),
      inside: false
    });
    
    // Hide labels
    axisRenderer.labels.template.setAll({
      visible: false
    });
    
    // Create value axis
    const xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        maxDeviation: 0,
        min: -100,
        max: 100,
        strictMinMax: true,
        renderer: axisRenderer
      })
    );
    
    // Add threshold labels
    const thresholds = {
      "-70": "Strong Risk Off",
      "-35": "Weak Risk Off",
      "0": "Neutral",
      "35": "Weak Risk On",
      "70": "Strong Risk On"
    };

    Object.entries(thresholds).forEach(([value, label]) => {
      const rangeDataItem = xAxis.makeDataItem({});
      rangeDataItem.set("value", parseInt(value));
      const range = xAxis.createAxisRange(rangeDataItem);
      range.get("label")?.setAll({
        text: label,
        fill: am5.color(options.darkMode ? "#ffffff" : "#000000"),
        fontFamily: "Inter",
        fontSize: 11,
        visible: true
      } as any);
    });
    
    // Create needle (clock hand)
    const axisDataItem = xAxis.makeDataItem({});
    axisDataItem.set("value", options.latestRecord.sentiment_value);
    const clockHand = am5radar.ClockHand.new(root, {
      pinRadius: 10,
      radius: am5.percent(85),
      bottomWidth: 8
    });
    
    const needleColor = am5.color(options.darkMode ? "#ffffff" : "#000000");
    clockHand.pin?.setAll({ fill: needleColor });
    clockHand.hand?.setAll({ fill: needleColor });
    axisDataItem.set("bullet", am5xy.AxisBullet.new(root, { sprite: clockHand }));
    xAxis.createAxisRange(axisDataItem);
    axisDataItem.get("grid")?.set("visible", false);
    
    // Add title with sentiment info
    const title = chart.plotContainer.children.push(am5.Label.new(root, {
      text: options.latestRecord.sentiment_name + ": " + Number(options.latestRecord.sentiment_value) + "%",
      fontSize: 16,
      fontWeight: "bold",
      fontFamily: "Inter",
      textAlign: "center",
      x: am5.percent(50),
      centerX: am5.percent(50),
      y: am5.percent(99),
      centerY: am5.percent(50),
      rotation: 0,
      fill: am5.color(options.darkMode ? "#ffffff" : "#000000")
    }));
    
    // Set background
    chart.set("background", am5.Rectangle.new(root, {
      fill: am5.color(options.darkMode ? "#000000" : "#ffffff")
    }));
    
    // Animate chart appearance
    chart.appear(1000, 100);
    
    console.log('✅ [AmCharts] Radar chart created successfully');
    
    return {
      type: 'amcharts',
      instance: {
        root: root,
        chart: chart,
        axisDataItem: axisDataItem,
        title: title
      }
    };
    
  } catch (error) {
    console.error('❌ [AmCharts] Error creating chart, falling back to enhanced SVG:', error);
    const svgInstance = createEnhancedRadarChart(options.containerId, options.wgid, options.latestRecord);
    return { type: 'svg', instance: svgInstance };
  }
}

function updateAmChart(instance: any, latestRecord: RiskSentimentRecord): void {
  try {
    
    if (instance && instance.axisDataItem && instance.title) {
      // Update needle position
      instance.axisDataItem.set("value", latestRecord.sentiment_value);
      
      // Update title and percentage
      instance.title.set("text", latestRecord.sentiment_name + ": " + Number(latestRecord.sentiment_value) + "%");
      
      console.log('✅ [AmCharts] Radar chart updated successfully');
    } else if (instance && instance.series) {
      // Fallback for different amCharts structure
      const data = [
        { category: "Risk Sentiment", value: latestRecord.sentiment_value }
      ];
      
      instance.series.data.setAll(data);
      if (instance.chart && instance.chart.xAxes) {
      instance.chart.xAxes.getIndex(0).data.setAll(data);
      }
      
      console.log('✅ [AmCharts] Radar chart updated successfully (fallback method)');
    } else {
      console.warn('⚠️ [AmCharts] Instance structure not recognized, update skipped');
    }
  } catch (error) {
    console.error('❌ [AmCharts] Error updating chart:', error);
  }
}

function disposeAmChart(instance: any): void {
  try {
    console.log('🧹 [AmCharts] Disposing radar chart');
    
    if (instance && instance.root) {
      try {
        // Check if root is still valid before disposing
        if (!instance.root.isDisposed && instance.root.container) {
          instance.root.dispose();
        }
      } catch (disposeError) {
        console.warn('⚠️ [AmCharts] Chart already disposed or invalid:', disposeError);
      }
      console.log('✅ [AmCharts] Radar chart disposed successfully');
    }
  } catch (error) {
    console.error('❌ [AmCharts] Error disposing chart:', error);
  }
}

// jQuery Risk Sentiment functions
export interface RiskSentimentData {
  riskLevel: number;
  sentiment: string;
  timestamp: string;
  region: string;
}

export interface RiskSentimentConfig {
  widgetId: string;
  chartType: 'line' | 'bar' | 'hybrid';
  region: string;
  autoUpdate: boolean;
  updateInterval: number;
}

/**
 * Initialize jQuery Risk Sentiment functionality
 */
export function initializeJQueryRiskSentiment(config: RiskSentimentConfig): void {
  try {
    console.log('🔧 [jQueryRiskSentiment] Initializing jQuery Risk Sentiment:', config);
    
    // Store configuration
    if (typeof window !== 'undefined') {
      (window as any).riskSentimentConfig = config;
    }
    
    // Initialize DOM elements
    const widgetContainer = document.querySelector(`[data-wgid="${config.widgetId}"]`);
    if (widgetContainer) {
      // Add jQuery-specific classes and attributes
      widgetContainer.classList.add('jquery-risk-sentiment');
      widgetContainer.setAttribute('data-chart-type', config.chartType);
      widgetContainer.setAttribute('data-region', config.region);
      
      console.log('✅ [jQueryRiskSentiment] Widget container initialized');
    }
    
    // Set up auto-update if enabled
    if (config.autoUpdate && config.updateInterval > 0) {
      const intervalId = setInterval(() => {
        console.log('🔄 [jQueryRiskSentiment] Auto-updating risk sentiment data');
        // Trigger data refresh
        fndisplayRiskSentiment(config);
      }, config.updateInterval * 1000);
      
      // Store interval ID for cleanup
      if (typeof window !== 'undefined') {
        (window as any).riskSentimentIntervalId = intervalId;
      }
    }
    
    console.log('✅ [jQueryRiskSentiment] Initialization complete');
  } catch (error) {
    console.error('❌ [jQueryRiskSentiment] Error during initialization:', error);
  }
}

/**
 * Display Risk Sentiment data using jQuery
 */
export function fndisplayRiskSentiment(config: RiskSentimentConfig): void {
  try {
    console.log('📊 [jQueryRiskSentiment] Displaying risk sentiment data:', config);
    
    const widgetContainer = document.querySelector(`[data-wgid="${config.widgetId}"]`);
    if (!widgetContainer) {
      console.error('❌ [jQueryRiskSentiment] Widget container not found');
      return;
    }
    
    // Create or update the display
    const displayContainer = widgetContainer.querySelector('.risk-sentiment-display') || 
                           document.createElement('div');
    
    if (!widgetContainer.querySelector('.risk-sentiment-display')) {
      displayContainer.className = 'risk-sentiment-display';
      (displayContainer as HTMLElement).style.cssText = `
        padding: 16px;
        background: #1a1a1a;
        border-radius: 8px;
        color: white;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      `;
      widgetContainer.appendChild(displayContainer);
    }
    
    // Display placeholder content
    displayContainer.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">Risk Sentiment</div>
        <div style="font-size: 14px; color: #9ca3af;">Region: ${config.region}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
          Chart Type: ${config.chartType} | Auto-Update: ${config.autoUpdate ? 'On' : 'Off'}
        </div>
      </div>
    `;
    
    console.log('✅ [jQueryRiskSentiment] Display updated successfully');
  } catch (error) {
    console.error('❌ [jQueryRiskSentiment] Error displaying data:', error);
  }
}