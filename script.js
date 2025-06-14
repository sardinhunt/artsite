// Store all fetched data globally
let allArtPieces = [];
// Current active filters
let currentFilters = {
    show: 'all', // 'all', 'paintings', 'sculptures'
    type: 'all'  // specific typeofpainting or 'all'
};

// DOM elements - Declare them here but assign within DOMContentLoaded
let artGrid;
let loadingIndicator;
let messageBox;
let messageTitle;
let messageContent;
let messageCloseButton;

let inquireButton;
let inquiryModal;
let closeInquiryModalButton;
let inquiryForm;
let inquiryMessageField;
let inquiryCountDisplay;
let clearMessageTextButton;

// New DOM elements for mobile filters
let mobileFilterButton;
let filterSidebar;
let closeFilterButton;
let mobileMenuOverlay;


// Formspree endpoint URL
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xovdgjev"; // Your Formspree endpoint

// Function to show a custom message box instead of alert()
function showMessageBox(title, message) {
    messageTitle.textContent = title;
    messageContent.textContent = message;
    messageBox.classList.remove('hidden');
}

// Mapping for inconsistent typeofpainting names
const typeMapping = {
    'figure': ['figure', 'figura'],
    'bagnanti': ['bagnanti', 'bagnante'],
    'nature morte': ['nature morte', 'natura morta'],
    'marine': ['marine', 'marina'],
    'cronache 44': ['cronache 44', 'cronaca 44'], // Ensure lowercase for comparison
    'paesaggi': ['paesaggi', 'paesaggio'], // Explicitly include paesaggio
    'autoritratti': ['autoritratti', 'autoritratto'], // Explicitly include autoritratto
    'ritratti': ['ritratti', 'ritratto'], // Added for 'Portraits'
    'allegorie': ['allegorie', 'allegoria'], // Added for 'Allegories'
    'animali': ['animali', 'animale'], // Added for 'Animals'
    'arte sacra': ['arte sacra', 'arte sacra'] // Added for 'Sacred Art' - assuming consistent
};

// Translations for inquiry modal messages
const inquiryTranslations = {
    'it': {
        generalTitle: "Richiesta informazioni generali:",
        generalMessage: "Desidero richiedere informazioni generali sulle opere d'arte o sull'archivio.",
        generalCountDisplay: "Nessuna opera selezionata. Puoi inviare una richiesta generica.",
        selectedTitle: "Richiesta informazioni per le seguenti opere:",
        selectedMessagePrefix: "", // This will be dynamic based on piece name/number
        selectedCountDisplay: (count) => `Hai selezionato ${count} opere.`,
        submittedTitle: "Richiesta Inviata!",
        submittedMessage: "Grazie per il tuo interesse. Ti contatteremo a breve.",
        sendErrorTitle: "Errore nell'invio",
        sendErrorMessage: (errors) => `C'è stato un problema con l'invio della tua richiesta: ${errors}. Riprova più tardi.`,
        connectionErrorTitle: "Errore di Connessione",
        connectionErrorMessage: "Non è possibile connettersi al server. Controlla la tua connessione e riprova.",
        unknownPiece: "Sconosciuto"
    },
    'en': {
        generalTitle: "General inquiry:",
        generalMessage: "I would like to request general information about the artworks or the archive.",
        generalCountDisplay: "No artworks selected. You can send a general inquiry.",
        selectedTitle: "Inquiry for the following artworks:",
        selectedMessagePrefix: "",
        selectedCountDisplay: (count) => `You have selected ${count} artworks.`,
        submittedTitle: "Request Sent!",
        submittedMessage: "Thank you for your interest. We will contact you shortly.",
        sendErrorTitle: "Submission Error",
        sendErrorMessage: (errors) => `There was a problem sending your request: ${errors}. Please try again later.`,
        connectionErrorTitle: "Connection Error",
        connectionErrorMessage: "Cannot connect to the server. Check your connection and try again.",
        unknownPiece: "Unknown"
    }
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
    if (artGrid) {
        artGrid.innerHTML = '';
    }

    const MAX_PAINTINGS_TO_SHOW = 260;
    const MAX_SCULPTURES_TO_SHOW = 15;

    const favoritedIds = favorites.get();
    let favoritePieces = [];
    
    // Separate pieces into paintings and sculptures globally, then apply overall limits
    let allPaintings = allArtPieces.filter(piece => piece.type === 'painting');
    let allSculptures = allArtPieces.filter(piece => piece.type === 'sculpture');

    // Apply global limits to paintings and sculptures, excluding favorites for now
    // We want the total pool of non-favorite paintings/sculptures to be capped.
    let limitedPaintings = allPaintings.filter(piece => !favoritedIds.includes(piece.id)).slice(0, MAX_PAINTINGS_TO_SHOW);
    let limitedSculptures = allSculptures.filter(piece => !favoritedIds.includes(piece.id)).slice(0, MAX_SCULPTURES_TO_SHOW);
    
    // Recombine limited sets with favorites to form the base for filtering
    let basePiecesForFiltering = [...favoritePieces]; // Start with all favorites
    
    // Add non-favorite paintings from the limited set, ensuring no duplicates with favorites
    limitedPaintings.forEach(piece => {
        if (!basePiecesForFiltering.some(favPiece => favPiece.id === piece.id)) {
            basePiecesForFiltering.push(piece);
        }
    });

    // Add non-favorite sculptures from the limited set, ensuring no duplicates with favorites
    limitedSculptures.forEach(piece => {
        if (!basePiecesForFiltering.some(favPiece => favPiece.id === piece.id)) {
            basePiecesForFiltering.push(piece);
        }
    });

    // Now, apply the 'show' and 'type' filters to this basePiecesForFiltering
    let finalFilteredPieces = basePiecesForFiltering.filter(piece => {
        // Apply 'show' filter
        if (currentFilters.show === 'paintings' && piece.type !== 'painting') {
            return false;
        }
        if (currentFilters.show === 'sculptures' && piece.type !== 'sculpture') {
            return false;
        }
        
        // Apply 'type' filter (only for paintings, and if not 'all')
        if (currentFilters.show !== 'sculptures' && currentFilters.type !== 'all') {
            if (piece.type !== 'painting') { // Ensure type filter only applies to paintings
                return false;
            }
            const normalizedPieceType = piece.typeofpainting ? piece.typeofpainting.toLowerCase() : '';
            const filterValue = currentFilters.type;

            let matchesTypeFilter = false;

            if (typeMapping[filterValue]) {
                if (typeMapping[filterValue].includes(normalizedPieceType)) {
                    matchesTypeFilter = true;
                }
            } else {
                if (normalizedPieceType === filterValue) {
                    matchesTypeFilter = true;
                }
            }
            
            if (!matchesTypeFilter) {
                return false;
            }
        }
        return true;
    });

    // Sort favorite pieces to appear first if they are part of the final filtered set
    finalFilteredPieces.sort((a, b) => {
        const aIsFavorite = favorites.isFavorite(a.id);
        const bIsFavorite = favorites.isFavorite(b.id);
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        // Optionally, maintain original sort order for non-favorites, or sort by id/name etc.
        // For simplicity, I'll keep the existing order for non-favorites among themselves.
        return 0; // Maintain existing relative order
    });

    // If no pieces match, display message
    if (finalFilteredPieces.length === 0) {
        if (artGrid) {
            artGrid.innerHTML = '<p class="text-gray-600 text-center col-span-full">No art pieces found matching your filters.</p>';
        }
        return;
    }

    // Render the final filtered and limited pieces
    finalFilteredPieces.forEach(piece => {
        const artCard = document.createElement('div');
        artCard.className = 'bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:scale-105 relative';

        let fullImagePath = piece.path;
        if (fullImagePath) {
            fullImagePath = fullImagePath.replace(/\.jpg$/, '.JPG');
        } else {
            fullImagePath = `https://placehold.co/300x400/cccccc/333333?text=${(piece.name || 'Art piece').replace(/ /g, '+')}`;
        }

        let displayImagePath = fullImagePath;
        if (piece.type === 'painting') {
            const filename = fullImagePath.split('/').pop();
            displayImagePath = `compressed/${filename}`;
        }

        let imageClasses = 'w-full h-48 object-center';
        let containerClasses = 'relative w-full h-48 flex items-center justify-center';

        if (piece.type === 'sculpture') {
            imageClasses += ' object-contain';
            containerClasses += ' bg-gray-300';
        } else {
            imageClasses += ' object-cover';
        }

        const isFav = favorites.isFavorite(piece.id);
        const favoriteIcon = isFav
            ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-red-500"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z" clip-rule="evenodd" /></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-gray-400 hover:text-red-500"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557L3.99 9.207a.563.563 0 0 1 .322-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.499Z" /></svg>';


        artCard.innerHTML = `
            <a href="${fullImagePath}" target="_blank" rel="noopener noreferrer" class="${containerClasses}">
                <img src="${displayImagePath}" alt="${piece.name || 'Art piece'}" class="${imageClasses}" onerror="this.onerror=null;this.src='${fullImagePath}';">
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
        if (artGrid) {
            artGrid.appendChild(artCard);
        }
    });

    document.querySelectorAll('.favorite-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const pieceId = event.currentTarget.dataset.id;
            if (favorites.isFavorite(pieceId)) {
                favorites.remove(pieceId);
            } else {
                favorites.add(pieceId);
            }
            renderArtPieces();
        });
    });
}

/**
 * Extracts the number from a path like "quadri/11.jpg"
 * @param {string} path - The image path.
 * @returns {string} The extracted number or "N/A".
*/
function extractImageNumber(path) {
    if (!path) return 'N/A';
    const match = path.match(/(\d+)\.jpg$/i); // Matches digits before .jpg (case-insensitive)
    return match ? match[1] : 'N/A';
}

/**
 * Handles the click of the inquiry button, populating and showing the modal.
*/
function handleInquiryButtonClick() {
    const favoritedIds = favorites.get();
    let messageContent = "";
    let inquiryTitle = "";

    // Determine the language: 'en' for English browsers, 'it' for others (or default)
    const lang = navigator.language.startsWith('en') ? 'en' : 'it';
    const currentLang = inquiryTranslations[lang] || inquiryTranslations['it']; // Fallback to Italian

    if (favoritedIds.length === 0) {
        inquiryTitle = currentLang.generalTitle;
        messageContent = currentLang.generalMessage;
        if (inquiryCountDisplay) {
            inquiryCountDisplay.textContent = currentLang.generalCountDisplay;
        }
        // Ensure editable if no favorites are selected, as it's a general inquiry
        if (inquiryMessageField) {
            inquiryMessageField.readOnly = false;
        }
    } else {
        inquiryTitle = currentLang.selectedTitle;
        const selectedPieces = allArtPieces.filter(piece => favoritedIds.includes(piece.id));

        selectedPieces.forEach((piece) => {
            const imageNumber = extractImageNumber(piece.path);
            messageContent += `${piece.name || currentLang.unknownPiece} #${imageNumber}\n`;
        });
        if (inquiryCountDisplay) {
            inquiryCountDisplay.textContent = currentLang.selectedCountDisplay(favoritedIds.length);
        }
        // Make editable if favorites are selected as well
        if (inquiryMessageField) {
            inquiryMessageField.readOnly = false;
        }
    }

    // Set the title for the modal
    const modalTitleElement = document.querySelector('#inquiry-modal h3');
    if (modalTitleElement) {
        modalTitleElement.textContent = inquiryTitle;
    }
    if (inquiryMessageField) {
        inquiryMessageField.value = messageContent.trim(); // Trim any leading/trailing newlines
    }

    if (inquiryModal) {
        inquiryModal.classList.remove('hidden');
    }
}

/**
 * Handles the submission of the inquiry form.
 */
function setupFormSubmission() {
    if (inquiryForm) { // Check if inquiryForm exists
        inquiryForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission

            const form = event.target;
            const formData = new FormData(form);

            // Determine the language for messages: 'en' for English browsers, 'it' for others (or default)
            const lang = navigator.language.startsWith('en') ? 'en' : 'it';
            const currentLang = inquiryTranslations[lang] || inquiryTranslations['it']; // Fallback to Italian

            try {
                const response = await fetch(FORMSPREE_ENDPOINT, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    showMessageBox(currentLang.submittedTitle, currentLang.submittedMessage);
                    if (inquiryModal) {
                        inquiryModal.classList.add('hidden'); // Close modal
                    }
                    form.reset(); // Clear form fields
                    // favorites.set([]); // NO LONGER CLEAR FAVORITES after successful inquiry
                    renderArtPieces(); // Re-render to update display if needed
                } else {
                    const data = await response.json();
                    if (data.errors) {
                        showMessageBox(currentLang.sendErrorTitle, currentLang.sendErrorMessage(data.errors.map(err => err.message).join(", ")));
                    } else {
                        showMessageBox(currentLang.sendErrorTitle, currentLang.sendErrorMessage("")); // Generic message if no specific errors
                    }
                }
            } catch (error) {
                console.error("Error during inquiry submission:", error);
                showMessageBox(currentLang.connectionErrorTitle, currentLang.connectionErrorMessage);
            }
        });
    }
}


/**
 * Initializes the filters and attaches event listeners.
 */
function initializeFilters() {
    document.querySelectorAll('[data-filter-group]').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const group = event.target.dataset.filterGroup;
            const value = event.target.dataset.filterValue.toLowerCase();

            // Logic to automatically switch to 'Dipinti' if a 'type' filter is clicked while 'Sculture' is active
            if (group === 'type' && currentFilters.show === 'sculptures' && value !== 'all') {
                currentFilters.show = 'paintings'; // Change 'show' filter to 'paintings'
                // Visually update the 'show' filter to 'Dipinti'
                document.querySelectorAll('[data-filter-group="show"]').forEach(showLink => {
                    showLink.classList.remove('bg-blue-100', 'text-blue-700', 'font-bold');
                    showLink.classList.add('text-gray-600');
                });
                const paintingsShowFilter = document.querySelector('[data-filter-group="show"][data-filter-value="paintings"]');
                if (paintingsShowFilter) {
                    paintingsShowFilter.classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
                }
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
                const allTypeFilter = document.querySelector('[data-filter-group="type"][data-filter-value="all"]');
                if (allTypeFilter) {
                    allTypeFilter.classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
                }
            }

            // Update active class for clicked filter
            document.querySelectorAll(`[data-filter-group="${group}"]`).forEach(siblingLink => {
                siblingLink.classList.remove('bg-blue-100', 'text-blue-700', 'font-bold');
                siblingLink.classList.add('text-gray-600');
            });
            event.target.classList.add('bg-blue-100', 'text-blue-700', 'font-bold');

            renderArtPieces();
            // Close the filter sidebar after a filter is selected on mobile
            if (window.innerWidth < 1024) { // 1024px is Tailwind's 'lg' breakpoint
                filterSidebar.classList.add('-translate-x-full');
                mobileMenuOverlay.classList.add('hidden');
            }
        });
    });
}

/**
 * Main function to load data and render the page.
 */
async function loadArchive() {
    // Check if loadingIndicator exists before trying to access it
    if (loadingIndicator) {
        loadingIndicator.classList.remove('hidden'); // Show loading indicator
    }

    const paintingsData = await fetchData('paintings.json');
    const sculpturesData = await fetchData('sculptures.json'); // Assuming sculptures.json exists

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

    // Check if loadingIndicator exists before trying to access it
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden'); // Hide loading indicator
    }

    renderArtPieces(); // Initial render
    initializeFilters(); // Set up filter event listeners

    // Set initial active filter for "All" (only applicable if filters exist)
    const allShowFilter = document.querySelector('[data-filter-group="show"][data-filter-value="all"]');
    if (allShowFilter) {
        allShowFilter.classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
    }
    const allTypeFilter = document.querySelector('[data-filter-group="type"][data-filter-value="all"]');
    if (allTypeFilter) {
        allTypeFilter.classList.add('bg-blue-100', 'text-blue-700', 'font-bold');
    }
}

// Load the archive and set up all event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements AFTER the DOM is fully loaded
    artGrid = document.getElementById('art-grid');
    loadingIndicator = document.getElementById('loading-indicator');
    messageBox = document.getElementById('message-box');
    messageTitle = document.getElementById('message-title');
    messageContent = document.getElementById('message-content');
    messageCloseButton = document.getElementById('message-close-button');

    inquireButton = document.getElementById('inquire-button');
    inquiryModal = document.getElementById('inquiry-modal');
    closeInquiryModalButton = document.getElementById('close-inquiry-modal');
    inquiryForm = document.getElementById('inquiry-form');
    inquiryMessageField = document.getElementById('inquiry-message');
    inquiryCountDisplay = document.getElementById('inquiry-count');
    clearMessageTextButton = document.getElementById('clear-message-text-button');

    // Assign new DOM elements for mobile filters
    mobileFilterButton = document.getElementById('mobile-filter-button');
    filterSidebar = document.getElementById('filter-sidebar');
    closeFilterButton = document.getElementById('close-filter-button');
    mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

    // Close message box handler
    if (messageCloseButton) {
        messageCloseButton.addEventListener('click', () => {
            messageBox.classList.add('hidden');
        });
    }

    // Event listeners for modal - only attach if elements exist
    if (inquireButton) {
        inquireButton.addEventListener('click', handleInquiryButtonClick);
    }
    if (closeInquiryModalButton) {
        closeInquiryModalButton.addEventListener('click', () => {
            inquiryModal.classList.add('hidden');
        });
    }

    // Add event listener for the new "Cancella testo" button
    if (clearMessageTextButton) {
        clearMessageTextButton.addEventListener('click', () => {
            if (inquiryMessageField) {
                inquiryMessageField.value = '';
            }
        });
    }

    // New: Event listener to close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (inquiryModal && !inquiryModal.classList.contains('hidden')) {
                inquiryModal.classList.add('hidden');
            }
            // Also close filter sidebar on Escape if open
            if (filterSidebar && !filterSidebar.classList.contains('-translate-x-full')) {
                filterSidebar.classList.add('-translate-x-full');
                mobileMenuOverlay.classList.add('hidden');
            }
        }
    });

    // Event listeners for mobile filter sidebar
    if (mobileFilterButton) {
        mobileFilterButton.addEventListener('click', () => {
            filterSidebar.classList.remove('-translate-x-full');
            mobileMenuOverlay.classList.remove('hidden');
        });
    }

    if (closeFilterButton) {
        closeFilterButton.addEventListener('click', () => {
            filterSidebar.classList.add('-translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
        });
    }

    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', () => {
            filterSidebar.classList.add('-translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
        });
    }

    setupFormSubmission();

    loadArchive();
});