import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionsCsv, priorityCsv, page = 1, pageSize = 50 } = body;

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Prepare request data
    const requestData = {
      GetRealtimeNewsTickerNew: 1,
      SectionNames: sectionsCsv || 'DAX,CAC,SMI,US Equities,Asian Equities,FTSE 100,European Equities,Global Equities,UK Equities,EUROSTOXX,US Equity Plus,US Data,Swiss Data,EU Data,Canadian Data,Other Data,UK Data,Other Central Banks,BoC,RBNZ,RBA,SNB,BoJ,BoE,ECB,PBoC,Fed,Bank Research,Fixed Income,Geopolitical,Rating Agency comments,Global News,Market Analysis,FX Flows,Asian News,Economic Commentary,Brexit,Energy & Power,Metals,Ags & Softs,Crypto,Emerging Markets,US Election,Trade,Newsquawk Update',
      NewsPriority: priorityCsv || 'Important,Rumour,Highlighted,Normal',
      Page: page,
      PageSize: pageSize,
      IsNotificationContext: false
    };

    // Call external PMT API
    const response = await fetch(`${API_CONFIG.UPSTREAM_API}getRealtimeNewsTicker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      console.error('Failed to fetch realtime news ticker data:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch news data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data,
      sectionsCsv: sectionsCsv,
      priorityCsv: priorityCsv,
      page: page,
      pageSize: pageSize,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error fetching realtime news ticker data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
