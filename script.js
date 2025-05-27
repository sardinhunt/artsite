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
 * Manages favorited items in localStorage.
 */
const favorites = {
    key: 'favoriteArtPieces',
    get() {
        try {
            return JSON.parse(localStorage.getItem(this.key)) || [];
        } catch (e) {
            console.error("Error parsing favorites from localStorage:", e);
            return [];
        }
    },
    set(favIds) {
        localStorage.setItem(this.key, JSON.stringify(favIds));
    },
    add(id) {
        const favIds = this.get();
        if (!favIds.includes(id)) {
            favIds.push(id);
            this.set(favIds);
        }
    },
    remove(id) {
        let favIds = this.get();
        favIds = favIds.filter(favId => favId !== id);
        this.set(favIds);
    },
    isFavorite(id) {
        return this.get().includes(id);
    }
};

/**
 * Renders the art pieces to the grid based on current filters and favorites.
 */
function renderArtPieces() {
    artGrid.innerHTML = ''; // Clear existing content

    const favoritedIds = favorites.get();
    let favoritePieces = [];
    let nonFavoritePieces = [];

    // Separate favorited and non-favorited pieces
    allArtPieces.forEach(piece => {
        if (favorites.isFavorite(piece.id)) {
            favoritePieces.push(piece);
        } else {
            nonFavoritePieces.push(piece);
        }
    });

    // Apply filters to non-favorite pieces only for the main grid
    const filteredNonFavoritePieces = nonFavoritePieces.filter(piece => {
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

            for (const key in typeMapping) {
                if (typeMapping[key].includes(normalizedType)) {
                    if (currentFilters.type === key) {
                        matchesTypeFilter = true;
                        break;
                    }
                }
            }
            if (!matchesTypeFilter && normalizedType === currentFilters.type) {
                matchesTypeFilter = true;
            }

            if (!matchesTypeFilter) {
                return false;
            }
        }
        return true;
    });

    // Combine favorited pieces (always shown at top) with filtered non-favorite pieces
    const piecesToRender = [...favoritePieces, ...filteredNonFavoritePieces];


    if (piecesToRender.length === 0) {
        artGrid.innerHTML = '<p class="text-gray-600 text-center col-span-full">No art pieces found matching your filters.</p>';
        return;
    }

    piecesToRender.forEach(piece => {
        const artCard = document.createElement('div');
        artCard.className = 'bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:scale-105 relative';

        let imageUrl = piece.path;
        if (imageUrl) {
            imageUrl = imageUrl.replace(/\.jpg$/, '.JPG');
        } else {
            imageUrl = `https://placehold.co/300x400/cccccc/333333?text=${(piece.name || 'Image').replace(/ /g, '+')}`;
        }

        // Determine image styling based on piece type
        let imageClasses = 'w-full h-48 object-center';
        let containerClasses = 'relative w-full h-48 flex items-center justify-center';

        if (piece.type === 'sculpture') {
            imageClasses += ' object-contain';
            containerClasses += ' bg-gray-300';
        } else {
            imageClasses += ' object-cover';
        }

        // Check if the piece is favorited to show the correct icon
        const isFav = favorites.isFavorite(piece.id);
        const favoriteIcon = isFav
            ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-red-500"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z" clip-rule="evenodd" /></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-gray-400 hover:text-red-500"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557L3.99 9.207a.563.563 0 0 1 .322-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.499Z" /></svg>';


        artCard.innerHTML = `
            <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" class="${containerClasses}">
                <img src="${imageUrl}" alt="${piece.name || 'Art piece'}" class="${imageClasses}" onerror="this.onerror=null;this.src='https://placehold.co/300x400/cccccc/333333?text=Image+Not+Found';">
            </a>
            <div class="p-4 relative">
                <h3 class="text-xl font-semibold text-gray-800 mb-1">${piece.name || 'Untitled'}</h3>
                <p class="text-sm text-gray-600 mb-2">${piece.typeofpainting || piece.type || 'N/A'}</p>
                <p class="text-xs text-gray-500">Date: ${piece.date || 'N/A'}</p>
                <p class="text-xs text-gray-500">Size: ${piece.size || 'N/A'}</p>
                <button class="favorite-btn absolute bottom-2 right-2 p-1 rounded-full bg-white bg-opacity-75" data-id="${piece.id}">
                    ${favoriteIcon}
                </button>
            </div>
        `;
        artGrid.appendChild(artCard);
    });

    // Add event listeners for favorite buttons after rendering
    document.querySelectorAll('.favorite-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const pieceId = event.currentTarget.dataset.id;
            if (favorites.isFavorite(pieceId)) {
                favorites.remove(pieceId);
            } else {
                favorites.add(pieceId);
            }
            renderArtPieces(); // Re-render to update display and order
        });
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

            // Logic to automatically switch to 'Dipinti' if a 'type' filter is clicked while 'Sculture' is active
            if (group === 'type' && currentFilters.show === 'sculptures' && value !== 'all') {
                currentFilters.show = 'paintings'; // Change 'show' filter to 'paintings'
                // Visually update the 'show' filter to 'Dipinti'
                document.querySelectorAll('[data-filter-group="show"]').forEach(showLink => {
                    showLink.classList.remove('bg-blue-100', 'text-blue-700', 'font-bold');
                    showLink.classList.add('text-gray-600');
                });
                document.querySelector('[data-filter-group="show"][data-filter-value="paintings"]').classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
            }


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
    // We are now keeping the original sort_order from the JSON
    const processedPaintings = paintingsData.map((p) => ({
        id: p.id || null,
        typeofpainting: p.typeofpainting || null,
        name: p.name || null,
        date: p.date || null,
        size: p.size || null,
        path: p.path || null,
        type: 'painting',
        sort_order: p.sort_order
    }));

    // For sculptures, assume similar structure and add type and continue sort_order
    // We are now keeping the original sort_order from the JSON
    const processedSculptures = sculpturesData.map((s) => ({
        id: s.id || null,
        typeofpainting: s.typeofpainting || null,
        name: s.name || null,
        date: s.date || null,
        size: s.size || null,
        path: s.path || null,
        type: 'sculpture',
        sort_order: s.sort_order
    }));

    allArtPieces = [...processedPaintings, ...processedSculptures];

    // THIS LINE WAS REMOVED to preserve the original JSON order for non-favorites:
    // allArtPieces.sort((a, b) => a.sort_order - b.sort_order);

    loadingIndicator.classList.add('hidden'); // Hide loading indicator
    renderArtPieces(); // Initial render
    initializeFilters(); // Set up filter event listeners

    // Set initial active filter for "All"
    document.querySelector('[data-filter-group="show"][data-filter-value="all"]').classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
    document.querySelector('[data-filter-group="type"][data-filter-value="all"]').classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
}

// Load the archive when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadArchive);