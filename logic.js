async function deleteMeal(mealId, mealName) {
    // Show confirmation dialog
    const confirmed = confirm(
        `⚠️ האם אתה בטוח שברצונך למחוק את הארוחה?\n\n` +
        `"${mealName}"\n\n` +
        `פעולה זו תמחק:\n` +
        `• את הארוחה מהספרייה\n` +
        `• את כל הרישומים של הארוחה הזו\n\n` +
        `לא ניתן לבטל פעולה זו!`
    );

    if (!confirmed) return;

    try {
        // Show loading state on delete button
        const deleteBtn = document.querySelector(`[onclick="deleteMeal('${mealId}', '${mealName}')"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>מוחק...';
        }

        // Delete from database
        await db.deleteMeal(mealId);

        // Also delete all daily logs for this meal
        await db.deleteAllLogsForMeal(mealId);

        // Reload meals to update UI
        await loadMealsFromDB();

        // Show success message
        console.log(`✅ Deleted meal: ${mealName}`);

        // Close any expanded cards since the meal is gone
        document.querySelectorAll('.meal-card.expanded').forEach(card => {
            const details = card.querySelector('.card-details');
            const icon = card.querySelector('.expand-icon i');

            details.classList.remove('show');
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
            card.classList.remove('expanded');
        });

    } catch (error) {
        console.error('❌ Error deleting meal:', error);
        alert('❌ שגיאה במחיקת הארוחה. נסה שוב.');

        // Restore button state on error
        const deleteBtn = document.querySelector(`[onclick="deleteMeal('${mealId}', '${mealName}')"]`);
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash me-2"></i>מחק ארוחה';
        }
    }
}
async function saveQuickLog() {
    const name  = document.getElementById('mealName').value.trim();
    const cal   = parseInt(document.getElementById('calories').value) || 0;
    const carb  = parseInt(document.getElementById('carbs').value) || 0;
    const prot  = parseInt(document.getElementById('protein').value) || 0;

    if (cal <= 0) { alert('הכנס קלוריות'); return; }

    try {
        await db.quickLog(name, cal, carb, prot);

        const modal = bootstrap.Modal.getInstance(document.getElementById('addMealModal'));
        modal.hide();
        resetAddMealForm();

        // Show success message
        console.log('✅ Added new meal:', name);
        // refresh today's view
        await loadDayData();

    } catch (e) {
        alert('שגיאה ברישום');  console.error(e);
    }

}

// Add new meal to database
async function addNewMeal() {
    const name = document.getElementById('mealName').value.trim();
    const ingredients = document.getElementById('ingredients').value.trim();
    const calories = parseInt(document.getElementById('calories').value) || 0;
    const carbs = parseInt(document.getElementById('carbs').value) || 0;
    const protein = parseInt(document.getElementById('protein').value) || 0;
    const imageInput = document.getElementById('mealImageInput');

    if (!name) {
        alert('אנא מלא את שם הארוחה');
        return;
    }

    if (!ingredients) {
        alert('אנא תאר את מרכיבי הארוחה');
        return;
    }

    if (calories <= 0) {
        alert('אנא הכנס מספר קלוריות תקין');
        return;
    }

    try {
        // Show loading state
        const saveBtn = document.querySelector('#addMealModal .btn-primary');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>שומר...';
        saveBtn.disabled = true;

        let imageData = 'placeholder.png'; //`https://picsum.photos/400/400?random=${Date.now()}`; // Default placeholder DISABLED PLACEHOLER IMAGE

        // If user selected an image, compress and convert to base64
        if (imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];

            // Check file size (warn if over 5MB)
            if (file.size > 5 * 1024 * 1024) {
                console.warn('Large image file, compressing...');
            }

            imageData = await compressAndConvertImage(file, 400, 0.7);
            console.log(`Image compressed from ${Math.round(file.size/1024)}KB to ${Math.round(imageData.length*0.75/1024)}KB`);
        }

        // Add to database
        const meal = await db.addMeal(name, imageData, ingredients, calories, carbs, protein);

        // Reload meals in UI
        await loadMealsFromDB();

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addMealModal'));
        modal.hide();
        resetAddMealForm();

        // Show success message
        console.log('✅ Added new meal:', meal.name);

        // Restore button state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;

    } catch (error) {
        console.error('❌ Error adding meal:', error);
        alert('שגיאה בהוספת הארוחה. נסה שוב.');

        // Restore button state
        const saveBtn = document.querySelector('#addMealModal .btn-primary');
        saveBtn.innerHTML = 'שמור ארוחה';
        saveBtn.disabled = false;
    }
}
async function resetDatabase() {
    // Show confirmation dialog
    const confirmed = confirm(
        '⚠️ האם אתה בטוח שברצונך למחוק את כל הנתונים?\n\n' +
        'פעולה זו תמחק:\n' +
        '• את כל הארוחות בספרייה\n' +
        '• את כל הרישומים של ארוחות שנאכלו\n' +
        '• את כל הנתונים התזונתיים\n\n' +
        'לא ניתן לבטל פעולה זו!'
    );

    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirmed = confirm(
        '🚨 אישור אחרון!\n\n' +
        'לחץ OK כדי למחוק לצמיתות את כל הנתונים.\n' +
        'לחץ Cancel כדי לבטל.'
    );

    if (!doubleConfirmed) return;

    try {
        // Show loading state
        const resetBtn = document.getElementById('resetDatabaseBtn');
        if (resetBtn) {
            resetBtn.disabled = true;
            resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>מוחק...';
        }

        // Clear all database data
        await db.clearAllData();

        // Reload the meals page to show empty state
        await loadMealsFromDB();

        // Show success message
        alert('✅ כל הנתונים נמחקו בהצלחה!');

        console.log('🔄 Database reset completed');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        alert('❌ שגיאה במחיקת הנתונים. נסה שוב.');
    } finally {
        // Restore button state
        const resetBtn = document.getElementById('resetDatabaseBtn');
        if (resetBtn) {
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fas fa-trash me-2"></i>מחק את כל הנתונים';
        }
    }
}

async function deleteLoggedFood(logId, mealName) {
    // Show confirmation dialog
    const confirmed = confirm(
        `⚠️ האם אתה בטוח שברצונך למחוק את הרישום?\n\n` +
        `"${mealName}"\n\n` +
        `פעולה זו תמחק רק את הרישום הזה ולא את הארוחה מהספרייה.`
    );

    if (!confirmed) return;

    try {
        // Show loading state on delete button
        const deleteBtn = document.querySelector(`[onclick="deleteLoggedFood('${logId}', '${mealName}')"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        // Delete from database
        await db.deleteLogEntry(logId);

        // Reload the current day data to refresh the UI

        await loadDayData();


        // Show success message in console
        console.log(`✅ Deleted log entry: ${mealName}`);

    } catch (error) {
        console.error('❌ Error deleting log entry:', error);
        alert('❌ שגיאה במחיקת הרישום. נסה שוב.');

        // Restore button state on error
        const deleteBtn = document.querySelector(`[onclick="deleteLoggedFood('${logId}', '${mealName}')"]`);
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    }
}

async function eatNow(event, mealId, mealName, calories) {
    //event.stopPropagation(); // Prevent card from closing

    if (!db) {
        console.error('Database not initialized');
        return;
    }

    try {
        // Show loading state
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>מוסיף...';
        btn.disabled = true;

        // Log the meal
        const logEntry = await db.eatMeal(mealId);

        // Show success state
        btn.innerHTML = '<i class="fas fa-check me-2"></i>נוסף!';
        btn.style.background = '#28a745';



        console.log(`✅ Logged: ${mealName} (${calories} calories) at ${logEntry.time}`);

        // Reset button after 2 seconds
        setTimeout(async () => {
            // btn.innerHTML = originalText;
            // btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            // btn.disabled = false;
            // Update usage count in UI by reloading meals
            await loadMealsFromDB();
        }, 1000);

    } catch (error) {
        console.error('❌ Error logging meal:', error);

        // Show error state
        const btn = event.target;
        btn.innerHTML = '<i class="fas fa-times me-2"></i>שגיאה';
        btn.style.background = '#dc3545';

        setTimeout(() => {
            btn.innerHTML = `<i class="fas fa-plus me-2"></i>אכלתי עכשיו`;
            btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            btn.disabled = false;
        }, 2000);
    }
}

function toggleCard(card) {

    const details = card.querySelector('.card-details');
    const icon = card.querySelector('.expand-icon i');

    // Toggle the expanded state
    if (details.classList.contains('show')) {
        details.classList.remove('show');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        card.classList.remove('expanded');
        document.getElementById('bgFocus').classList.add('d-none');
    } else {
        // Close all other cards first
        document.querySelectorAll('.card-details.show').forEach(detail => {
            detail.classList.remove('show');
        });
        document.querySelectorAll('.expand-icon i').forEach(expandIcon => {
            expandIcon.classList.remove('fa-chevron-up');
            expandIcon.classList.add('fa-chevron-down');
        });
        document.querySelectorAll('.meal-card.expanded').forEach(expandedCard => {
            expandedCard.classList.remove('expanded');
        });

        // Open this card
        document.getElementById('bgFocus').classList.remove('d-none');
        details.classList.add('show');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        card.classList.add('expanded');
    }
}

function toggleDayCard(card) {
    const details = card.querySelector('.day-details');
    const icon = card.querySelector('.expand-icon i');

    if (details.classList.contains('show')) {
        details.classList.remove('show');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        card.classList.remove('expanded');
    } else {
        // Close all other cards
        document.querySelectorAll('.day-details.show').forEach(detail => {
            detail.classList.remove('show');
        });
        document.querySelectorAll('.expand-icon i').forEach(expandIcon => {
            expandIcon.classList.remove('fa-chevron-up');
            expandIcon.classList.add('fa-chevron-down');
        });
        document.querySelectorAll('.day-card.expanded').forEach(expandedCard => {
            expandedCard.classList.remove('expanded');
        });

        // Open this card
        details.classList.add('show');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        card.classList.add('expanded');
    }
}


/* ----------------------------------------------------------
Central configuration – put this near the top of your main
script (or import from a separate config.js).
---------------------------------------------------------- */
const CONFIG = {
    AI_ENDPOINT: 'https://openai-backend-k753.onrender.com/ask'
};

/* ----------------------------------------------------------
   Nutrition-AI helper – keeps fetch logic out of the UI code.
---------------------------------------------------------- */
async function estimateNutrition(ingredientsText) {
    const prompt = `
              הערך התזונתי של הארוחה הבאה: ${ingredientsText}.
              החזר רק שלושה מספרים מופרדים בפסיקים –
              קלוריות, פחמימות בגרם, חלבון בגרם.
              למשל: 450, 12, 22
              ללא טקסט נוסף.
            `.trim();

    const res = await fetch(CONFIG.AI_ENDPOINT, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ question: prompt })
    });

    if (!res.ok) {
        const { error, detail } = await res.json().catch(() => ({}));
        throw new Error(error || detail || `HTTP ${res.status}`);
    }

    const data = await res.json();

    /*  Two supported response shapes:
          1. { calories:123, carbs:12, protein:22 }
          2. { answer: "123, 12, 22" }
    */
    if (typeof data.calories === 'number') {
        return data;                // shape #1
    }

    const match = (data.answer || '').match(/([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/);
    if (!match) throw new Error('תבנית תשובה לא נתמכת');

    return {
        calories: parseFloat(match[1]),
        carbs   : parseFloat(match[2]),
        protein : parseFloat(match[3])
    };
}

/* ----------------------------------------------------------
   calcNewMeal – UI layer: disables button, calls helper,
   fills the form, and always restores state.
---------------------------------------------------------- */
async function calcNewMeal(btnEl = document.activeElement) {
    const ingredients = document.getElementById('ingredients').value.trim();
    if (!ingredients) { alert('אין מרכיבים'); return; }

    // fall-back in case function called from inline onclick
    if (!btnEl || !btnEl.classList.contains('btn')) {
        btnEl = document.querySelector('#addMealModal .btn-success');
    }

    /* ----- loading state ----- */
    const originalHTML = btnEl.innerHTML;
    btnEl.innerHTML   = '<i class="fas fa-spinner fa-spin me-1"></i> מחשב...';
    btnEl.disabled    = true;

    try {
        const { calories, carbs, protein } = await estimateNutrition(ingredients);

        /*  populate inputs  */
        document.getElementById('calories').value = calories;
        document.getElementById('carbs').value    = carbs;
        document.getElementById('protein').value  = protein;

    } catch (err) {
        console.error(err);
        alert(`❌ שגיאה בחישוב הערכים:\n${err.message}`);
    } finally {
        /* ----- restore button ----- */
        btnEl.innerHTML = originalHTML;
        btnEl.disabled  = false;
    }
}



// Helper functions (add these to your main app)
function getHebrewDayName(date) {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[date.getDay()];
}

function getHebrewMonthName(date) {
    const months = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return months[date.getMonth()];
}

function formatHebrewDate2(date, includeToday = true) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (includeToday && date.toDateString() === today.toDateString()) {
        return 'היום';
    } else if (includeToday && date.toDateString() === yesterday.toDateString()) {
        return 'אתמול';
    }

    const dayName = getHebrewDayName(date);
    const day = date.getDate();
    const month = getHebrewMonthName(date);

    return `יום ${dayName}, ${day} ${month}`;
}

function getCalorieStatus(calories) {

    if (calories <= db.DAILY_GOAL) return 'under';
    if (calories <= db.DAILY_GOAL + 200) return 'over';
    return 'way-over';
}

