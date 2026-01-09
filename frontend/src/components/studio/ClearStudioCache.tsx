import { useEffect } from 'react';

/**
 * ClearStudioCache Component
 * 
 * Add this to your StudioPage temporarily to clear localStorage cache
 * and see the new track colors.
 * 
 * Usage:
 * 1. Import this component in StudioPage.tsx
 * 2. Add <ClearStudioCache /> at the top of the component
 * 3. Refresh the page
 * 4. Remove the component after colors update
 */

export function ClearStudioCache() {
    useEffect(() => {
        // Clear studio data from localStorage
        localStorage.removeItem('aimusic.studio.tracks');
        localStorage.removeItem('aimusic.studio.assets');
        console.log('✅ Studio cache cleared! Refresh the page to see new colors.');

        // Auto-reload after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#1a1a1a',
            color: '#fff',
            padding: '20px',
            borderRadius: '8px',
            zIndex: 9999,
            textAlign: 'center'
        }}>
            <p>Clearing cache and reloading...</p>
        </div>
    );
}

export default ClearStudioCache;
