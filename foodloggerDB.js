// Simple IndexedDB wrapper
class FoodLoggerDB {
    constructor() {
        this.db = null;
        this.DAILY_GOAL = 1700;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FoodLoggerDB', 1);

            request.onupgradeneeded = event => {
                const db = event.target.result;

                // Meals store
                if (!db.objectStoreNames.contains('meals')) {
                    const mealsStore = db.createObjectStore('meals', { keyPath: 'id' });
                    mealsStore.createIndex('usageCount', 'usageCount');
                }

                // Daily logs store
                if (!db.objectStoreNames.contains('dailyLogs')) {
                    const logsStore = db.createObjectStore('dailyLogs', {
                        keyPath: 'id',
                    });
                    logsStore.createIndex('date', 'date');
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async addMeal(name, image, ingredients, calories, carbs, protein) {
        const meal = {
            id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            image,
            ingredients,
            calories,
            carbs,
            protein,
            usageCount: 0, // Start with 0 usage
            createdAt: new Date().toISOString(),
        };

        const store = this.db
            .transaction(['meals'], 'readwrite')
            .objectStore('meals');
        return new Promise((resolve, reject) => {
            const request = store.add(meal);
            request.onsuccess = () => resolve(meal);
            request.onerror = () => reject(request.error);
        });
    }




    async getMeals() {
        const store = this.db
            .transaction(['meals'], 'readonly')
            .objectStore('meals');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const meals = request.result;
                // Sort by usage count (highest first)
                meals.sort((a, b) => b.usageCount - a.usageCount);
                resolve(meals);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async searchMeals(term) {
        const meals = await this.getMeals();
        return meals.filter(
            meal => meal.name.includes(term) || meal.ingredients.includes(term)
        );
    }
    async getMeal(id) {
        const store = this.db
            .transaction(['meals'], 'readonly')
            .objectStore('meals');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async eatMeal(mealId) {
        const meal = await this.getMeal(mealId);
        if (!meal) throw new Error('Meal not found');

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const time = now.toTimeString().substring(0, 5);

        // Create log entry
        const log = {
            id: `log_${today}_${Date.now()}`,
            date: today,
            mealId,
            mealName: meal.name,
            time,
            calories: meal.calories,
            carbs: meal.carbs,
            protein: meal.protein,
            loggedAt: now.toISOString(),
        };

        // Update meal usage count
        meal.usageCount += 1;

        const transaction = this.db.transaction(
            ['meals', 'dailyLogs'],
            'readwrite'
        );
        await new Promise((resolve, reject) => {
            transaction.objectStore('meals').put(meal);
            transaction.objectStore('dailyLogs').add(log);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });

        return log;
    }

    async quickLog(name, calories, carbs, protein) {
        const now       = new Date();
        const today     = now.toISOString().split('T')[0];
        const time      = now.toTimeString().substring(0,5);

        const log = {
            id        : `quick_${Date.now()}`,
            date      : today,
            mealId    : null,
            mealName  : name || 'רישום כללי',
            time,
            calories,
            carbs,
            protein,
            isQuick   : true,
            loggedAt  : now.toISOString()
        };

        const store = this.db.transaction(['dailyLogs'], 'readwrite')
            .objectStore('dailyLogs');
        await new Promise((res, rej) => {
            const req = store.add(log);
            req.onsuccess = res;
            req.onerror   = () => rej(req.error);
        });

        return log;
    }


    async getDayTotals(date) {
        const store = this.db
            .transaction(['dailyLogs'], 'readonly')
            .objectStore('dailyLogs');
        const index = store.index('date');

        return new Promise((resolve, reject) => {
            const request = index.getAll(date);
            request.onsuccess = () => {
                const logs = request.result;
                const totals = logs.reduce(
                    (total, log) => ({
                        calories: total.calories + log.calories,
                        carbs: total.carbs + log.carbs,
                        protein: total.protein + log.protein,
                    }),
                    { calories: 0, carbs: 0, protein: 0 }
                );
                resolve(totals);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getDayMeals(date) {
        const store = this.db
            .transaction(['dailyLogs'], 'readonly')
            .objectStore('dailyLogs');
        const index = store.index('date');

        return new Promise((resolve, reject) => {
            const request = index.getAll(date);
            request.onsuccess = () => {
                const logs = request.result;
                logs.sort((a, b) => a.time.localeCompare(b.time));
                resolve(logs);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllData() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                ['meals', 'dailyLogs'],
                'readwrite'
            );

            transaction.objectStore('meals').clear();
            transaction.objectStore('dailyLogs').clear();

            transaction.oncomplete = () => {
                console.log('✅ All database data cleared');
                resolve();
            };
            transaction.onerror = () => {
                console.error('❌ Error clearing database:', transaction.error);
                reject(transaction.error);
            };
        });
    }
    async deleteMeal(mealId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['meals'], 'readwrite');
            const store = transaction.objectStore('meals');
            const request = store.delete(mealId);

            request.onsuccess = () => {
                console.log(`✅ Meal deleted: ${mealId}`);
                resolve();
            };

            request.onerror = () => {
                console.error(`❌ Error deleting meal: ${mealId}`, request.error);
                reject(request.error);
            };
        });
    }
    async deleteAllLogsForMeal(mealId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dailyLogs'], 'readwrite');
            const store = transaction.objectStore('dailyLogs');

            // Get all logs and filter by mealId
            const request = store.getAll();

            request.onsuccess = () => {
                const allLogs = request.result;
                const logsToDelete = allLogs.filter(log => log.mealId === mealId);

                if (logsToDelete.length === 0) {
                    console.log(`✅ No logs found for meal: ${mealId}`);
                    resolve();
                    return;
                }

                // Delete each matching log
                let deletedCount = 0;
                logsToDelete.forEach(log => {
                    const deleteRequest = store.delete(log.id);
                    deleteRequest.onsuccess = () => {
                        deletedCount++;
                        if (deletedCount === logsToDelete.length) {
                            console.log(
                                `✅ Deleted ${deletedCount} logs for meal: ${mealId}`
                            );
                            resolve();
                        }
                    };
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            };

            request.onerror = () => {
                console.error(
                    `❌ Error getting logs for meal: ${mealId}`,
                    request.error
                );
                reject(request.error);
            };
        });
    }
    async deleteLogEntry(logId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dailyLogs'], 'readwrite');
            const store = transaction.objectStore('dailyLogs');
            const request = store.delete(logId);

            request.onsuccess = () => {
                console.log(`✅ Deleted log entry: ${logId}`);
                resolve();
            };

            request.onerror = () => {
                console.error(`❌ Error deleting log entry: ${logId}`, request.error);
                reject(request.error);
            };
        });
    }
}


