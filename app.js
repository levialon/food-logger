/* ---- your original inline code, almost verbatim ---- */
let currentPage = 0;
let db = null;

async function initializeApp() {
    db = new FoodLoggerDB();
    await db.init();
    await loadMealsFromDB();
    console.log('✅ App initialised (module mode)');
}


function switchTab(pageIndex) {
    currentPage = pageIndex;

    // Update tab active state
    document.querySelectorAll('.tab').forEach((tab, index) => {
        if (index === pageIndex) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Move to the page
    const container = document.getElementById('appContainer');

    const page = container.querySelectorAll('.page')[pageIndex];
    page.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    window.scrollTo(0, 0);

    //        container.style.transform = `translateX(${pageIndex * 100}vw)`;

    // Show/hide add button based on page
    const addBtn = document.getElementById('addBtn');
    if (pageIndex === 0) {
        addBtn.style.display = 'flex';
    } else {
        addBtn.style.display = 'none';
    }

    if (pageIndex === 1) {
        loadDayData();
    } else if (pageIndex === 2) {
        loadWeeklyOverview();
        //loadDayData('yesterday');
    }
    // Load daily summary data for summary pages
    //loadDailySummary(pageIndex);
}

function handleImageCapture(input) {
    const button = document.getElementById('cameraButton');

    if (input.files && input.files[0]) {
        const fileName = input.files[0].name;
        button.innerHTML = `
                                    <div class="text-center">
                                        <i class="fas fa-check-circle fa-2x mb-2" style="color: var(--success-color);"></i>
                                        <div>תמונה נבחרה</div>
                                        <small>${fileName}</small>
                                    </div>
                                `;
        button.classList.add('has-image');
    }
}

// Convert file to compressed base64
function compressAndConvertImage(file, maxWidth = 400, quality = 0.7) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            // Calculate new dimensions
            let { width, height } = img;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            // Set canvas size
            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to compressed base64
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };

        // Create object URL for the image
        img.src = URL.createObjectURL(file);
    });
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', initializeApp);
