import { useEffect, useRef } from 'react';

/**
 * Custom React Hook that automatically subscribes to real-time database changes (via Supabase Broadcast or Postgres Replication)
 * and triggers a reactive state refetch. This supports seamless live-sync of data across devices, mobiles, and desktops.
 * 
 * @param fetchData The data-fetching routine of the component.
 * @param deps Optional list of dependencies which, when altered, will also trigger a fetch.
 */
export function useDataSync(fetchData: () => void | Promise<void>, deps: any[] = []) {
  const fetchRef = useRef(fetchData);

  // Keep the reference up-to-date with the latest enclosure scope variables to prevent stale closures.
  useEffect(() => {
    fetchRef.current = fetchData;
  }, [fetchData]);

  // Execute on initial run or whenever dependencies alter.
  useEffect(() => {
    fetchRef.current();
  }, deps);

  // Subscribe to local/remote real-time database change events.
  useEffect(() => {
    let timeoutId: any = null;

    const debouncedFetch = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        fetchRef.current();
      }, 150); // Debounce to prevent multiple rapid successive refetches and flickering
    };

    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      
      // If the sync event is for a local storage key, do NOT trigger database refetch!
      if (detail && typeof detail === 'object') {
        const table = detail.table;
        if (typeof table === 'string' && (table.startsWith('hms_') || table.startsWith('storage_'))) {
          return;
        }
      }
      
      console.log('useDataSync: Refreshing component state due to real-time database change event:', detail);
      debouncedFetch();
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('hms_')) {
        console.log('useDataSync: Storage key updated or manual storage event, refreshing:', event.key || 'manual');
        debouncedFetch();
      }
    };

    // Support standard BroadcastChannel for instant same-device cross-panel/tab synchronization
    let localChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
        localChannel = new BroadcastChannel('hms-local-sync');
        localChannel.onmessage = (event) => {
          if (event.data && event.data.key && event.data.key.startsWith('hms_')) {
            console.log('useDataSync: Local BroadcastChannel sync received for key:', event.data.key);
            debouncedFetch();
          }
        };
      }
    } catch (e) {
      console.warn('Failed to initialize local BroadcastChannel:', e);
    }

    window.addEventListener('supabase-data-sync', handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('supabase-data-sync', handleSync);
      window.removeEventListener('storage', handleStorage);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (localChannel) {
        try {
          localChannel.close();
        } catch (e) {}
      }
    };
  }, []);
}
