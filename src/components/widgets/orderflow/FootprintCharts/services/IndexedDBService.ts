/**
 * @file IndexedDBService.ts
 * @description Service for persisting drawings and chart state to IndexedDB
 */

import { Drawing } from '../types';

const DB_NAME = 'footprint-charts-db';
const DB_VERSION = 1;
const DRAWINGS_STORE = 'drawings';
const SETTINGS_STORE = 'settings';

interface StoredDrawing extends Drawing {
  chartId: string;
  createdAt: number;
  updatedAt: number;
}

interface ChartSettings {
  chartId: string;
  viewOffset: number;
  viewCount: number;
  yDomain: [number, number] | null;
  updatedAt: number;
}

export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private chartId: string;

  constructor(chartId: string = 'default') {
    this.chartId = chartId;
  }

  /**
   * Initialize the database connection
   */
  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create drawings store
        if (!db.objectStoreNames.contains(DRAWINGS_STORE)) {
          const drawingsStore = db.createObjectStore(DRAWINGS_STORE, { keyPath: 'id' });
          drawingsStore.createIndex('chartId', 'chartId', { unique: false });
          drawingsStore.createIndex('type', 'type', { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'chartId' });
        }
      };
    });
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ==================================================================================
  // DRAWINGS OPERATIONS
  // ==================================================================================

  /**
   * Save a drawing to the database
   */
  public async saveDrawing(drawing: Drawing): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAWINGS_STORE], 'readwrite');
      const store = transaction.objectStore(DRAWINGS_STORE);

      const storedDrawing: StoredDrawing = {
        ...drawing,
        chartId: this.chartId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const request = store.put(storedDrawing);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save multiple drawings at once
   */
  public async saveDrawings(drawings: Drawing[]): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAWINGS_STORE], 'readwrite');
      const store = transaction.objectStore(DRAWINGS_STORE);

      const now = Date.now();

      for (const drawing of drawings) {
        const storedDrawing: StoredDrawing = {
          ...drawing,
          chartId: this.chartId,
          createdAt: now,
          updatedAt: now
        };
        store.put(storedDrawing);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Load all drawings for the current chart
   */
  public async loadDrawings(): Promise<Drawing[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAWINGS_STORE], 'readonly');
      const store = transaction.objectStore(DRAWINGS_STORE);
      const index = store.index('chartId');
      const request = index.getAll(this.chartId);

      request.onsuccess = () => {
        const storedDrawings = request.result as StoredDrawing[];
        // Convert back to Drawing type (strip extra fields)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const drawings: Drawing[] = storedDrawings.map(({ chartId, createdAt, updatedAt, ...drawing }) => drawing);
        resolve(drawings);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a drawing from the database
   */
  public async deleteDrawing(id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAWINGS_STORE], 'readwrite');
      const store = transaction.objectStore(DRAWINGS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all drawings for the current chart
   */
  public async clearDrawings(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAWINGS_STORE], 'readwrite');
      const store = transaction.objectStore(DRAWINGS_STORE);
      const index = store.index('chartId');
      const request = index.openCursor(this.chartId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ==================================================================================
  // SETTINGS OPERATIONS
  // ==================================================================================

  /**
   * Save chart view settings
   */
  public async saveSettings(settings: Omit<ChartSettings, 'chartId' | 'updatedAt'>): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);

      const storedSettings: ChartSettings = {
        ...settings,
        chartId: this.chartId,
        updatedAt: Date.now()
      };

      const request = store.put(storedSettings);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load chart view settings
   */
  public async loadSettings(): Promise<Omit<ChartSettings, 'chartId' | 'updatedAt'> | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get(this.chartId);

      request.onsuccess = () => {
        if (request.result) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { chartId, updatedAt, ...settings } = request.result as ChartSettings;
          resolve(settings);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ==================================================================================
  // UTILITY METHODS
  // ==================================================================================

  /**
   * Check if IndexedDB is available
   */
  public static isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Get database size estimate
   */
  public async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return null;
  }
}
