import { NextRequest, NextResponse } from 'next/server';
import { getPrefsCookie } from '@/lib/cookie';
import { UserPreferences } from '@/types/preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  darkMode: true,
  fixedScroll: false,
  notificationsOn: true,
  newWidgetLayout: false,
  newRecapsLayout: false,
  newResearchFilesLayout: false,
  numFormat: 'EU Format',
  dateFormat: 'DD/MM/YYYY',
  notificationSoundId: '0',
  version: 1,
};

export async function GET(request: NextRequest) {
  try {
    const preferences = await getPrefsCookie();
    
    if (!preferences) {
      return NextResponse.json(DEFAULT_PREFERENCES);
    }
    
    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}