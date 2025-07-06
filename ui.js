// UI UTILS FOR FOODLOGGER SEVENDAYS
// Load meals from database and display in UI
async function loadMealsFromDB() {
    try {
        const meals = await db.getMeals();
        const mealsGrid = document.getElementById('mealsGrid');
        let bg = document.getElementById('bgFocus');
        if (bg) {
            bg.classList.add('d-none');
        }

        // Clear existing content
        mealsGrid.innerHTML = '';

        if (meals.length === 0) {
            // Show empty state
            mealsGrid.innerHTML = `
                                        <div class="col-12">
                                            <div class="text-center py-5">
                                                <i class="fas fa-utensils fa-3x text-muted mb-3"></i>
                                                <h4 class="text-muted">אין ארוחות עדיין</h4>
                                                <p class="text-muted">לחץ על כפתור ה-+ כדי להוסיף את הארוחה הראשונה שלך</p>
                                            </div>
                                        </div>
                                    `;
        } else {
            // Create meal cards
            meals.forEach(meal => {
                const cardHtml = createMealCard(meal);
                mealsGrid.insertAdjacentHTML('beforeend', cardHtml);
            });
        }

        console.log(`Loaded ${meals.length} meals from database`);
    } catch (error) {
        console.error('Error loading meals:', error);
    }
}

// Create HTML for a meal card
function createMealCard(meal) {
    return `
                                <div class="col-4">
                                    <div class="meal-card"  data-meal-id="${meal.id}" data-usage="${meal.usageCount}">
                                        <div class="card-closed" style="background-image: url('${meal.image}');" onclick="toggleCard(this.parentElement)">
                                            <div class="expand-icon">
                                                <i class="fas fa-chevron-down"></i>
                                            </div>
                                            <div class="card-overlay">
                                                <h5 class="meal-title">${meal.name}</h5>
                                                <div class="card-stats">
                                                    <span class="usage-counte">
                                                        ${meal.calories} קלוריות
                                                    </span>
                                                    <span class="usage-counter">
                                                        ${meal.usageCount} פעמים
                                                    </span>
                                                    <button class="btn btn-outline-danger btn-sm" onclick="deleteMeal('${meal.id}', '${meal.name}')">X</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="card-details">
                                            <div class="card-details-content">
                                                <p class="ingredients-text">
                                                    ${meal.ingredients}
                                                </p>
                                                 <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap">
                                                    <!--<span class="badge bg-primary stats-badge">
                                                        ${meal.calories} קלוריות
                                                    </span>-->
                                                    <span class="badge bg-success stats-badge">
                                                        ${meal.carbs} גרם פחמימות
                                                    </span>
                                                    <span class="badge bg-info stats-badge">
                                                        ${meal.protein} גרם חלבון
                                                    </span>
                                                </div>
                                                <button class="btn eat-now-btn" onclick="eatNow(event, '${meal.id}', '${meal.name}', ${meal.calories})">
                                                    אכלתי עכשיו
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
}
// Reset the add meal form
function resetAddMealForm() {
    document.querySelector('#addMealModal form').reset();
    const cameraButton = document.getElementById('cameraButton');
    cameraButton.innerHTML = `
                                <div class="text-center">
                                    <i class="fas fa-camera fa-2x mb-2"></i>
                                    <div>לחץ לצילום</div>
                                    <small>או בחר תמונה מהגלריה</small>
                                </div>
                            `;
    cameraButton.classList.remove('has-image');
}
async function filterMeals() {
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearch');
    const searchTerm = searchInput.value.trim();
    const noResultsMessage = document.getElementById('noResultsMessage');

    // Show/hide clear button
    if (searchTerm.length > 0) {
        clearButton.style.display = 'block';
    } else {
        clearButton.style.display = 'none';
    }

    // Only filter after 2 characters
    if (searchTerm.length < 2) {
        // Show all meals
        await loadMealsFromDB();
        noResultsMessage.style.display = 'none';
        return;
    }

    try {
        // Search in database
        const meals = await db.searchMeals(searchTerm);
        const mealsGrid = document.getElementById('mealsGrid');

        // Clear and show results
        mealsGrid.innerHTML = '';

        if (meals.length === 0) {
            noResultsMessage.style.display = 'block';
        } else {
            noResultsMessage.style.display = 'none';
            meals.forEach(meal => {
                const cardHtml = createMealCard(meal);
                mealsGrid.insertAdjacentHTML('beforeend', cardHtml);
            });
        }
    } catch (error) {
        console.error('Search error:', error);
        // Show no results if search fails
        document.getElementById('mealsGrid').innerHTML = '';
        noResultsMessage.style.display = 'block';
    }
}

async function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearch');

    searchInput.value = '';
    clearButton.style.display = 'none';

    // Show all meals
    await loadMealsFromDB();
    document.getElementById('noResultsMessage').style.display = 'none';
    searchInput.focus();
}
async function loadDayData() {
    if (!db) return;

    try {
        // Calculate target date
        const today = new Date();
        let targetDate, pageIndex;
        targetDate = today.toISOString().split('T')[0];
        pageIndex = 1;

        // Get data from database
        const [totals, meals] = await Promise.all([
            db.getDayTotals(targetDate),
            db.getDayMeals(targetDate)
        ]);

        // Find the target page element
        const pageElement = document.querySelector(`.page:nth-child(${pageIndex + 1})`);
        if (!pageElement) {
            console.error(`Page element not found for Today`);
            return;
        }

        // Update page header
        const pageHeader = pageElement.querySelector('.header h1');
        if (pageHeader) {
            pageHeader.innerHTML = `
                                היום
                            `;
        }

        // Update nutrition summary
        const nutritionSummary = pageElement.querySelector('.nutrition-summary');
        if (nutritionSummary) {
            const isOverGoal = totals.calories > db.DAILY_GOAL;

            // Update CSS classes for color coding
            if (isOverGoal) {
                nutritionSummary.classList.add('over-goal');
            } else {
                nutritionSummary.classList.remove('over-goal');
            }

            // Update nutrition content
            nutritionSummary.innerHTML = `
                                <div class="nutrition-row">
                                    <div class="nutrition-value ${isOverGoal ? 'over-goal' : ''}">${totals.calories}</div>
                                    <div class="nutrition-label">
                                    מתוך ${db.DAILY_GOAL }
                                    </div>

                                </div>
                                <div class="nutrition-row">
                                    <div class="nutrition-value">${totals.carbs}</div>
                                    <div class='nutrition-label'>פחמימות</div>
                                </div>
                                <div class="nutrition-row">
                                    <div class="nutrition-value">${totals.protein}</div>
                                    <div class='nutrition-label'>חלבונים</div>
                                </div>
                            `;
        }

        // Update meals list
        const dailySummary = pageElement.querySelector('.daily-summary');
        if (dailySummary) {
            // Remove existing meal items
            const existingMeals = dailySummary.querySelectorAll('.meal-item');
            existingMeals.forEach(item => item.remove());
            //dailySummary.innerHTML="";

            if (meals.length === 0) {
                // Show empty state
                const emptyState = document.createElement('div');
                emptyState.className = 'meal-item text-center py-4 text-muted';
                emptyState.innerHTML = `
                                    <div class="mb-3">
                                        <i class="fas fa-utensils fa-3x text-muted"></i>
                                    </div>
                                    <h5 class="text-muted">לא נרשמו ארוחות היום</h5>

                                `;
                dailySummary.append(emptyState);
            } else {
                // Add meal items
                meals.forEach((meal, index) => {
                    const mealItem = document.createElement('div');
                    mealItem.className = 'meal-item';
                    if (meal.isQuick) mealItem.classList.add('QuickMeal');
                    mealItem.style.animationDelay = `${index * 0.1}s`; // Stagger animation

                    mealItem.innerHTML = `
                                        <div class="meal-item-header">
                                            <span class="meal-time">${meal.time}</span>
                                            <span class="meal-name" >${meal.mealName}</span>

                                            
                                          <span class="${meal.isQuick ? 'fas fa-bolt' : ''}" style="margin-inline-start: auto;">
                                          <button
                                              class="btn btn-outline-danger btn-sm"
                                              onclick="deleteLoggedFood('${meal.id}', '${meal.mealName}')"
                                              title="מחק רישום זה"
                                              style="padding: 0.2rem 0.4rem; font-size: 0.7rem; border-color:rgb(46, 46, 46); color:rgb(46, 46, 46);">
                                              מחק
                                          </button>
                                          </span>
                                        </div>

                                        <div class="meal-nutrition mt-2"">
                                            <small class="text-muted">
                                               ${meal.calories} קלוריות | ${meal.carbs} פחמימות | ${meal.protein} חלבונים
                                               
                                            </small>
                                        </div>
                                    `;

                    dailySummary.appendChild(mealItem);
                });
            }
        }

        console.log(`✅ Loaded today data: ${totals.calories} calories, ${meals.length} meals`);

    } catch (error) {
        console.error(`❌ Error loading ${dayType} data:`, error);

        // Show error state
        //const pageElement = document.querySelector(`.page:nth-child(${dayType === 'today' ? 2 : 3})`);
        //const dailySummary = pageElement?.querySelector('.daily-summary');
        if (dailySummary) {
            dailySummary.innerHTML = `
                                <div class="text-center py-4 text-danger">
                                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                                    <div>שגיאה בטעינת נתונים</div>
                                    <small>נסה לרענן את הדף</small>
                                </div>
                            `;
        }
    }
}

// Add this function to your main app
async function loadWeeklyOverview() {
    if (!db) return;

    try {
        const weekData = [];
        const today = new Date();

        // Get data for the last 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];

            // Get day totals and meals from database
            const [totals, meals] = await Promise.all([
                db.getDayTotals(dateString),
                db.getDayMeals(dateString)
            ]);

            weekData.push({
                date: dateString,
                dateObj: date,
                meals: meals,
                totalCalories: totals.calories,
                totalCarbs: totals.carbs
            });
        }

        // Find the third page element (yesterday tab)

        const weeklyPage = document.querySelector('.page:nth-child(3)');

        if (!weeklyPage) return;

        weeklyPage.innerHTML= `
                            <div class="header">
                              <div class="container-fluid">
                                 <h1 class="h3 mb-0 text-center">
                                           סקירה שבועית
                                 </h1>
                               </div>
                             </div>

                             <div class="container-fluid px-3">
                                <!-- Week Summary -->
                                <div class="week-summary">
                                     <div class="summary-grid" id="weekSummary">
                                        ${createWeekSummary(weekData)}
                                    </div>
                                </div>

                                <!-- Daily Cards -->
                                <div class="daily-cards" id="dailyCards">
                                    ${weekData.map((dayData, index) => createDayCard(dayData, index)).join('')}
                                </div>
                              </div>
                            `;


        console.log('✅ Weekly overview loaded with real data');

    } catch (error) {
        console.error('❌ Error loading weekly overview:', error);

        // Show error state
        const weeklyPage = document.querySelector('.page:nth-child(3)');
        const container = weeklyPage?.querySelector('.container-fluid');
        if (container) {
            container.innerHTML = `
                                <div class="text-center py-4 text-danger">
                                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                                    <div>שגיאה בטעינת הסקירה השבועית</div>
                                    <small>נסה לרענן את הדף</small>
                                </div>
                            `;
        }
    }
}



function createDayCard(dayData, index) {

    const status = getCalorieStatus(dayData.totalCalories);
    const statusClass = status === 'under' ? '' : status === 'over' ? 'over-target' : 'way-over-target';

    const mealsHtml = dayData.meals.length === 0 ?
        '<div class="empty-day">לא נרשמו ארוחות ביום זה</div>' :
        dayData.meals.map(meal => `
                            <div class="meal-entry">
                                <div class="weekday-meal-time"> 
                                        ${meal.time}
                                </div>
                                <span class="weekday-meal-name">${meal.mealName}</span>
                                <span class="weekday-meal-calories">  ${meal.calories}</span>
<span class="${meal.isQuick ? 'fas fa-bolt fa-2xs' : ''}"></span>
                            </div>
                        `).join('');

    return `
                        <div class="day-card" onclick="toggleDayCard(this)" data-day-index="${index}">
                            <div class="day-card-closed ${statusClass}">
                                <div class="expand-icon">
                                    <i class="fas fa-chevron-down"></i>
                                </div>


                                <div class="weekday-summary d-flex">
                                    <div class="weekday-item ${statusClass}">
                                          <div class="weekday-date"> ${formatHebrewDate2(dayData.dateObj)}</div>
                                          <strong>${dayData.totalCalories}</strong>
                                          קלוריות ו-
                                          <strong>${dayData.totalCarbs}</strong>
                                          פחמימות ב-
                                          <strong>${dayData.meals.length}</strong>
                                            ארוחות
                                    </div>

                                </div>
                            </div>

                            <div class="day-details">
                                <div class="day-details-content">
                                    <div class="meals-list">
                                        ${mealsHtml}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
}

function createWeekSummary(weekData) {

    // Filter to only days with meals logged
    const daysWithMeals = weekData.filter(day => day.meals.length > 0 && day.totalCalories > 500);

    // Calculate metrics only for days with meals
    const greenDays = daysWithMeals.filter(day.totalCalories <= db.DAILY_GOAL ).length;
    const redDays = daysWithMeals.filter(day => day.totalCalories > db.DAILY_GOAL).length;

    // Average calories only for days with meals (avoid division by zero)
    const avgCalories = daysWithMeals.length > 0 ?
        Math.round(daysWithMeals.reduce((sum, day) => sum + day.totalCalories, 0) / daysWithMeals.length) : 0;

    // Total meals across all days
    const totalMeals = weekData.reduce((sum, day) => sum + day.meals.length, 0);

    return `
                        <div class="summary-item">
                            <div class="summary-number">${totalMeals}</div>
                            <div class="summary-label">ארוחות</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-number green-days">${greenDays}</div>
                            <div class="summary-label">בטווח</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-number red-days">${redDays}</div>
                            <div class="summary-label">מעל יעד</div>
                        </div>
                         <div class="summary-item">
                            <div class="summary-number avg-calories">${avgCalories}</div>
                            <div class="summary-label">ממוצע קלוריות</div>
                        </div>
                    `;
}
