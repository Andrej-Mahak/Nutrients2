// Calculate personalized RDAs based on body composition
function calculatePersonalizedRDAs(userProfile) {
    const rdaDatabase = {
        male: {
            protein: weight => weight * 0.8,
            calcium: age => age > 50 ? 1200 : 1000,
            iron: age => 8,
            vitaminC: age => 90,
            vitaminD: age => 15,
            omega3: () => 1.6
        },
        female: {
            protein: weight => weight * 0.8,
            calcium: age => age > 50 ? 1200 : 1000,
            iron: age => age > 50 ? 8 : 18,
            vitaminC: age => 75,
            vitaminD: age => 15,
            omega3: () => 1.1
        }
    };

    const gender = userProfile.gender || 'male';
    const weight = userProfile.bodyComposition.weight;
    const age = userProfile.bodyComposition.age;
    
    // Adjust for activity level
    const activityMultipliers = {
        sedentary: 1.0,
        light: 1.1,
        moderate: 1.2,
        active: 1.35,
        very_active: 1.5
    };
    
    const activityMultiplier = activityMultipliers[userProfile.activityLevel] || 1.2;
    
    // Calculate base RDAs
    const baseRDAs = {
        protein: rdaDatabase[gender].protein(weight) * activityMultiplier,
        calcium: rdaDatabase[gender].calcium(age),
        iron: rdaDatabase[gender].iron(age),
        vitaminC: rdaDatabase[gender].vitaminC(age),
        vitaminD: rdaDatabase[gender].vitaminD(age),
        omega3: rdaDatabase[gender].omega3()
    };
    
    // Adjust for goals
    if (userProfile.goals.primaryGoal === "muscle_gain") {
        baseRDAs.protein *= 1.5;
    } else if (userProfile.goals.primaryGoal === "weight_loss") {
        baseRDAs.protein *= 1.2;
    }
    
    return baseRDAs;
}

// Find nutrient gaps
function findNutrientGaps(currentNutrients, targetRDAs) {
    const gaps = {};
    
    for (const nutrient in targetRDAs) {
        const current = currentNutrients[nutrient] || 0;
        const target = targetRDAs[nutrient];
        gaps[nutrient] = target - current;
    }
    
    return gaps;
}

// Recommend foods based on nutrient gaps
function recommendFoods(nutrientGaps, restrictions, foodDatabase) {
    // Filter foods based on dietary restrictions
    const allowedFoods = foodDatabase.filter(food => {
        if (!restrictions || restrictions.length === 0) return true;
        return !restrictions.some(r => food.restrictions.includes(r));
    });
    
    // Score each food based on how well it addresses deficiencies
    const scoredFoods = allowedFoods.map(food => {
        let score = 0;
        let contributionBreakdown = {};
        
        for (const nutrient in nutrientGaps) {
            if (nutrientGaps[nutrient] > 0) { // We have a deficiency
                const contribution = (food.nutrients[nutrient] || 0) / nutrientGaps[nutrient];
                // Weight by importance (could be customized further)
                const importance = nutrient === 'protein' ? 2 : 1;
                score += contribution * importance;
                contributionBreakdown[nutrient] = contribution;
            }
        }
        
        // Calculate nutrient density (nutrients per calorie)
        const totalNutrientValue = Object.values(food.nutrients).reduce((sum, val) => sum + val, 0);
        const nutrientDensity = totalNutrientValue / (food.calories || 1);
        
        return {
            food,
            totalScore: score * nutrientDensity,
            contributionBreakdown
        };
    });
    
    // Sort by score and return top recommendations
    return scoredFoods
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 5); // Return top 5 foods
}

// Main function to analyze nutrition
function analyzeNutrition() {
    // Show loading state
    document.getElementById('loader').style.display = 'block';
    
    // Simulate AI processing time
    setTimeout(() => {
        // Collect user data
        const userProfile = {
            gender: document.getElementById('gender').value,
            bodyComposition: {
                weight: parseFloat(document.getElementById('weight').value),
                height: parseFloat(document.getElementById('height').value),
                age: parseInt(document.getElementById('age').value),
                bodyFatPercentage: parseFloat(document.getElementById('bodyFat').value) || null
            },
            activityLevel: document.getElementById('activityLevel').value,
            goals: {
                primaryGoal: document.getElementById('primaryGoal').value,
                secondaryGoal: document.getElementById('secondaryGoal').value,
                weeklyTarget: parseFloat(document.getElementById('weeklyTarget').value)
            }
        };
        
        // Collect current nutrients
        const currentNutrients = {
            protein: parseFloat(document.getElementById('protein').value) || 0,
            calcium: parseFloat(document.getElementById('calcium').value) || 0,
            iron: parseFloat(document.getElementById('iron').value) || 0,
            vitaminC: parseFloat(document.getElementById('vitaminC').value) || 0,
            vitaminD: parseFloat(document.getElementById('vitaminD').value) || 0,
            omega3: parseFloat(document.getElementById('omega3').value) || 0
        };
        
        // Collect dietary restrictions
        const restrictions = [];
        if (document.getElementById('vegetarian').checked) restrictions.push('vegetarian');
        if (document.getElementById('vegan').checked) restrictions.push('vegan');
        if (document.getElementById('gluten-free').checked) restrictions.push('gluten-free');
        if (document.getElementById('dairy-free').checked) restrictions.push('dairy-free');
        if (document.getElementById('nut-free').checked) restrictions.push('nut-free');
        
        // Calculate personalized RDAs
        const personalizedRDAs = calculatePersonalizedRDAs(userProfile);
        
        // Find nutrient gaps
        const nutrientGaps = findNutrientGaps(currentNutrients, personalizedRDAs);
        
        // Recommend foods
        const recommendations = recommendFoods(nutrientGaps, restrictions, foodDatabase);
        
        // Display recommendations
        displayRecommendations(recommendations, nutrientGaps);
        
        // Hide loader and show recommendations
        document.getElementById('loader').style.display = 'none';
        document.getElementById('recommendations').style.display = 'block';
    }, 2000);
}

// Display food recommendations
function displayRecommendations(recommendations, nutrientGaps) {
    const container = document.getElementById('foodRecommendations');
    container.innerHTML = '';
    
    recommendations.forEach(rec => {
        const food = rec.food;
        const card = document.createElement('div');
        card.className = 'food-card';
        
        // Find top nutrient contributions
        const topNutrients = Object.entries(rec.contributionBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([nutrient, value]) => ({ nutrient, value }));
        
        card.innerHTML = `
            <div class="food-img">Food Image: ${food.name}</div>
            <div class="food-info">
                <h3>${food.name}</h3>
                <p><strong>Category:</strong> ${food.category}</p>
                <p><strong>Serving:</strong> ${food.servingSize}</p>
                <p><strong>Calories:</strong> ${food.calories} kcal</p>
                <p class="nutrient-match">Top matches for your needs:</p>
                ${topNutrients.map(n => `
                    <p>${n.nutrient}: ${food.nutrients[n.nutrient]} ${getNutrientUnit(n.nutrient)}</p>
                    <div class="progress-bar">
                        <div class="fill" style="width: ${Math.min(100, n.value * 100)}%"></div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(card);
    });
}

function getNutrientUnit(nutrient) {
    const units = {
        protein: 'g',
        calcium: 'mg',
        iron: 'mg',
        vitaminC: 'mg',
        vitaminD: 'μg',
        omega3: 'g'
    };
    return units[nutrient] || '';
}

// Tab navigation
function nextTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show the selected tab
    document.getElementById(tabId).classList.add('active');
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
}

function previousTab(tabId) {
    nextTab(tabId);
}