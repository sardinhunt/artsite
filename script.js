// Store all fetched data globally
let allArtPieces = [];
// Current active filters
let currentFilters = {
    show: 'all', // 'all', 'paintings', 'sculptures'
    type: 'all'  // specific typeofpainting or 'all'
};

// DOM elements
const artGrid = document.getElementById('art-grid');
const loadingIndicator = document.getElementById('loading-indicator');
const messageBox = document.getElementById('message-box');
const messageTitle = document.getElementById('message-title');
const messageContent = document.getElementById('message-content');
const messageCloseButton = document.getElementById('message-close-button');

// Function to show a custom message box instead of alert()
function showMessageBox(title, message) {
    messageTitle.textContent = title;
    messageContent.textContent = message;
    messageBox.classList.remove('hidden');
}

// Close message box handler
messageCloseButton.addEventListener('click', () => {
    messageBox.classList.add('hidden');
});

// Mapping for inconsistent typeofpainting names
const typeMapping = {
    'figure': ['figure', 'figura'],
    'bagnanti': ['bagnanti', 'bagnante'],
    'nature morte': ['nature morte', 'natura morta'],
    'marine': ['marine', 'marina'],
    'cronache 44': ['cronache 44', 'cronaca 44'], // Ensure lowercase for comparison
    'paesaggi': ['paesaggi', 'paesaggio'], // Explicitly include paesaggio
    'autoritratti': ['autoritratti', 'autoritratto'] // Explicitly include autoritratto
};

/**
 * Fetches JSON data from a given URL.
 * @param {string} url - The URL of the JSON file.
 * @returns {Promise<Array>} A promise that resolves to an array of data.
 */
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} from ${url}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Could not fetch data from ${url}:`, error);
        showMessageBox('Error', `Failed to load data from ${url}. Please try again later.`);
        return [];
    }
}

/**
 * Renders the art pieces to the grid based on current filters.
 */
function renderArtPieces() {
    artGrid.innerHTML = ''; // Clear existing content
    const filteredPieces = allArtPieces.filter(piece => {
        // Apply 'show' filter
        if (currentFilters.show === 'paintings' && piece.type !== 'painting') {
            return false;
        }
        if (currentFilters.show === 'sculptures' && piece.type !== 'sculpture') {
            return false;
        }

        // Apply 'type' filter for paintings only
        if (currentFilters.show !== 'sculptures' && currentFilters.type !== 'all') {
            const normalizedType = piece.typeofpainting ? piece.typeofpainting.toLowerCase() : '';
            let matchesTypeFilter = false;

            // Check if the normalizedType is part of a mapped group
            for (const key in typeMapping) {
                if (typeMapping[key].includes(normalizedType)) {
                    if (currentFilters.type === key) {
                        matchesTypeFilter = true;
                        break;
                    }
                }
            }
            // If not part of a mapped group, check for a direct match (shouldn't be necessary if all variations are mapped)
            if (!matchesTypeFilter && normalizedType === currentFilters.type) {
                matchesTypeFilter = true;
            }

            if (!matchesTypeFilter) {
                return false;
            }
        }
        return true;
    });

    if (filteredPieces.length === 0) {
        artGrid.innerHTML = '<p class="text-gray-600 text-center col-span-full">No art pieces found matching your filters.</p>';
        return;
    }

    filteredPieces.forEach(piece => {
        const artCard = document.createElement('div');
        artCard.className = 'bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:scale-105';
        
        let imageUrl = piece.path;
        if (imageUrl) {
            // This line converts the .jpg in JSON to .JPG to match your actual filenames
            imageUrl = imageUrl.replace(/\.jpg$/, '.JPG'); 
        } else {
            // Fallback for missing path
            imageUrl = `https://placehold.co/300x400/cccccc/333333?text=${(piece.name || 'Image').replace(/ /g, '+')}`;
        }

        // Log the image URL to console for debugging
        console.log(`Attempting to load image: ${imageUrl}`);

        artCard.innerHTML = `
            <a href="${imageUrl}" target="_blank" rel="noopener noreferrer">
                <img src="${imageUrl}" alt="${piece.name || 'Art piece'}" class="w-full h-48 object-cover object-center" onerror="this.onerror=null;this.src='https://placehold.co/300x400/cccccc/333333?text=Image+Not+Found';">
            </a>
            <div class="p-4">
                <h3 class="text-xl font-semibold text-gray-800 mb-1">${piece.name || 'Untitled'}</h3>
                <p class="text-sm text-gray-600 mb-2">${piece.typeofpainting || piece.type || 'N/A'}</p>
                <p class="text-xs text-gray-500">Date: ${piece.date || 'N/A'}</p>
                <p class="text-xs text-gray-500">Size: ${piece.size || 'N/A'}</p>
                <p class="text-xs text-gray-500">Order: ${piece.sort_order || 'N/A'}</p>
            </div>
        `;
        artGrid.appendChild(artCard);
    });
}

/**
 * Initializes the filters and attaches event listeners.
 */
function initializeFilters() {
    document.querySelectorAll('[data-filter-group]').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const group = event.target.dataset.filterGroup;
            const value = event.target.dataset.filterValue.toLowerCase(); // Ensure lowercase for consistency

            // Update active filter
            currentFilters[group] = value;

            // If 'show' filter changes to sculptures, reset 'type' filter
            if (group === 'show' && value === 'sculptures') {
                currentFilters.type = 'all';
                // Visually update the 'type' filter to 'All Types'
                document.querySelectorAll('[data-filter-group="type"]').forEach(typeLink => {
                    typeLink.classList.remove('bg-blue-100', 'text-blue-700', 'font-bold');
                    typeLink.classList.add('text-gray-600');
                });
                document.querySelector('[data-filter-group="type"][data-filter-value="all"]').classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
            }
            
            // Update active class for clicked filter
            document.querySelectorAll(`[data-filter-group="${group}"]`).forEach(siblingLink => {
                siblingLink.classList.remove('bg-blue-100', 'text-blue-700', 'font-bold');
                siblingLink.classList.add('text-gray-600');
            });
            event.target.classList.add('bg-blue-100', 'text-blue-700', 'font-bold');

            renderArtPieces();
        });
    });
}

/**
 * Main function to load data and render the page.
 */
async function loadArchive() {
    loadingIndicator.classList.remove('hidden'); // Show loading indicator

    const paintingsData = await fetchData('paintings.json');
    const sculpturesData = await fetchData('sculptures.json'); // Assuming sculptures.json exists

    // Add a 'type' field and sort_order, replace empty strings with null
    const processedPaintings = paintingsData.map((p, index) => ({
        id: p.id || null,
        typeofpainting: p.typeofpainting || null,
        name: p.name || null,
        date: p.date || null,
        size: p.size || null,
        path: p.path || null,
        type: 'painting',
        sort_order: index + 1
    }));

    // For sculptures, assume similar structure and add type and continue sort_order
    const processedSculptures = sculpturesData.map((s, index) => ({
        id: s.id || null,
        typeofpainting: s.typeofpainting || null, // Sculptures might not have this, but keep for consistency
        name: s.name || null,
        date: s.date || null,
        size: s.size || null,
        path: s.path || null,
        type: 'sculpture',
        sort_order: paintingsData.length + index + 1
    }));

    allArtPieces = [...processedPaintings, ...processedSculptures];

    loadingIndicator.classList.add('hidden'); // Hide loading indicator
    renderArtPieces(); // Initial render
    initializeFilters(); // Set up filter event listeners

    // Set initial active filter for "All"
    document.querySelector('[data-filter-group="show"][data-filter-value="all"]').classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
    document.querySelector('[data-filter-group="type"][data-filter-value="all"]').classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
}

// Load the archive when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadArchive);