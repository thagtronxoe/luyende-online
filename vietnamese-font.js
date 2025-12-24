/**
 * Vietnamese Font for jsPDF
 * Using Times New Roman Unicode subset for Vietnamese
 * This is a minimal approach - load font from CDN instead of embedding
 */

// Load Roboto font with Vietnamese support from CDN
async function loadVietnameseFont(doc) {
    try {
        // Fetch Roboto Regular with Vietnamese support
        const fontUrl = 'https://cdn.jsdelivr.net/npm/@aspect-build/aspect-fonts@1.4.0/fonts/times-new-roman.ttf';

        const response = await fetch(fontUrl);
        if (!response.ok) {
            console.log('Could not load Vietnamese font, using fallback');
            return false;
        }

        const fontData = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(fontData);

        // Add font to virtual file system
        doc.addFileToVFS('TimesNewRoman.ttf', base64);
        doc.addFont('TimesNewRoman.ttf', 'TimesNewRoman', 'normal');
        doc.setFont('TimesNewRoman');

        return true;
    } catch (err) {
        console.error('Error loading Vietnamese font:', err);
        return false;
    }
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Export for use
window.loadVietnameseFont = loadVietnameseFont;
