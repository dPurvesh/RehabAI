// Meal Planner Page
const MealPlannerPage = {
  selectedIngredients: [],
  selectedGoal: 'recovery',
  selectedDietary: 'none',
  generatedPlan: null,

  CATEGORIES: {
    'Proteins': ['Chicken', 'Fish', 'Eggs', 'Tofu', 'Paneer', 'Lentils', 'Chickpeas', 'Turkey', 'Shrimp', 'Greek Yogurt'],
    'Vegetables': ['Broccoli', 'Spinach', 'Carrots', 'Bell Peppers', 'Tomatoes', 'Sweet Potato', 'Kale', 'Zucchini', 'Mushrooms', 'Onions'],
    'Grains': ['Rice', 'Oats', 'Quinoa', 'Whole Wheat Bread', 'Pasta', 'Brown Rice', 'Millet', 'Barley'],
    'Fruits': ['Banana', 'Berries', 'Apple', 'Orange', 'Mango', 'Pineapple', 'Avocado', 'Pomegranate'],
    'Dairy & Fats': ['Milk', 'Cheese', 'Butter', 'Olive Oil', 'Coconut Oil', 'Almonds', 'Walnuts', 'Peanut Butter'],
    'Spices & Others': ['Turmeric', 'Ginger', 'Garlic', 'Honey', 'Lemon', 'Cinnamon', 'Black Pepper', 'Cumin'],
  },

  render() {
    const el = document.getElementById('page-content');
    this.selectedIngredients = [];
    this.generatedPlan = null;

    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="chef-hat"></i> AI-powered nutrition planning</div>
          <h1>Meal Planner</h1>
          <p>Select your available ingredients and let RehabAI generate recovery-focused meal plans with anti-inflammatory nutrition.</p>
        </div>
        <div class="header-pills">
          <span class="pill"><i data-lucide="sparkles"></i>Gemini AI</span>
          <span class="pill"><i data-lucide="heart-pulse"></i>Recovery-focused</span>
        </div>
      </div>

      <div class="meal-layout">
        <div class="meal-selector-panel">
          <div class="card">
            <div class="card-title"><i data-lucide="shopping-basket"></i> Your Ingredients</div>
            <p class="card-sub">Tap ingredients you have available. Selected: <strong id="meal-count">0</strong></p>
            <div class="meal-categories">
              ${Object.entries(this.CATEGORIES).map(([cat, items]) => `
                <div class="meal-category">
                  <div class="meal-cat-title">${cat}</div>
                  <div class="meal-chips">
                    ${items.map(item => `
                      <button class="meal-chip" data-ingredient="${item}" onclick="MealPlannerPage.toggleIngredient(this, '${item}')">
                        ${item}
                      </button>`).join('')}
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <div class="meal-config-panel">
          <div class="card">
            <div class="card-title"><i data-lucide="target"></i> Recovery Goal</div>
            <div class="meal-goal-options">
              <button class="meal-goal-btn active" data-goal="recovery" onclick="MealPlannerPage.setGoal(this, 'recovery')">
                <i data-lucide="heart-pulse"></i>
                <strong>Recovery Support</strong>
                <span>Anti-inflammatory focus</span>
              </button>
              <button class="meal-goal-btn" data-goal="muscle" onclick="MealPlannerPage.setGoal(this, 'muscle')">
                <i data-lucide="dumbbell"></i>
                <strong>Muscle Building</strong>
                <span>High protein focus</span>
              </button>
              <button class="meal-goal-btn" data-goal="energy" onclick="MealPlannerPage.setGoal(this, 'energy')">
                <i data-lucide="zap"></i>
                <strong>Energy Boost</strong>
                <span>Complex carbs focus</span>
              </button>
              <button class="meal-goal-btn" data-goal="weight" onclick="MealPlannerPage.setGoal(this, 'weight')">
                <i data-lucide="scale"></i>
                <strong>Weight Management</strong>
                <span>Calorie-conscious</span>
              </button>
            </div>
          </div>

          <div class="card">
            <div class="card-title"><i data-lucide="leaf"></i> Dietary Preference</div>
            <div class="meal-dietary-options">
              <button class="meal-diet-btn active" data-diet="none" onclick="MealPlannerPage.setDietary(this, 'none')">No Preference</button>
              <button class="meal-diet-btn" data-diet="vegetarian" onclick="MealPlannerPage.setDietary(this, 'vegetarian')">Vegetarian</button>
              <button class="meal-diet-btn" data-diet="vegan" onclick="MealPlannerPage.setDietary(this, 'vegan')">Vegan</button>
              <button class="meal-diet-btn" data-diet="high-protein" onclick="MealPlannerPage.setDietary(this, 'high-protein')">High Protein</button>
              <button class="meal-diet-btn" data-diet="low-carb" onclick="MealPlannerPage.setDietary(this, 'low-carb')">Low Carb</button>
              <button class="meal-diet-btn" data-diet="anti-inflammatory" onclick="MealPlannerPage.setDietary(this, 'anti-inflammatory')">Anti-Inflammatory</button>
            </div>
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="meal-generate-btn" onclick="MealPlannerPage.generate()">
            <i data-lucide="sparkles"></i> Generate Meal Plan
          </button>
        </div>
      </div>

      <div id="meal-result" class="meal-result"></div>`;

    App.refreshIcons();
  },

  toggleIngredient(btn, ingredient) {
    btn.classList.toggle('selected');
    const idx = this.selectedIngredients.indexOf(ingredient);
    if (idx === -1) this.selectedIngredients.push(ingredient);
    else this.selectedIngredients.splice(idx, 1);
    const countEl = document.getElementById('meal-count');
    if (countEl) countEl.textContent = this.selectedIngredients.length;
  },

  setGoal(btn, goal) {
    this.selectedGoal = goal;
    document.querySelectorAll('.meal-goal-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  setDietary(btn, diet) {
    this.selectedDietary = diet;
    document.querySelectorAll('.meal-diet-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  async generate() {
    if (this.selectedIngredients.length < 2) {
      alert('Please select at least 2 ingredients to generate a meal plan.');
      return;
    }

    const btn = document.getElementById('meal-generate-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Generating with AI...'; App.refreshIcons(); }

    const result = document.getElementById('meal-result');
    if (result) result.innerHTML = '<div class="meal-loading"><div class="meal-loading-spinner"></div><p>RehabAI is crafting your personalized meal plan...</p></div>';

    try {
      const surgDate = App.patientProfile?.surgery_date;
      const refDate = surgDate || App.user?.created_at;
      const ctx = {
        injury_type: App.patientProfile?.injury_type,
        day_number: refDate
          ? Math.max(1, Math.ceil((Date.now() - new Date(refDate).getTime()) / 86400000))
          : 1,
        score: App.lastPrediction?.recovery_score ?? 50,
      };

      const res = await api.generateMeal({
        ingredients: this.selectedIngredients,
        goal: this.selectedGoal,
        dietary: this.selectedDietary,
        patient_context: ctx,
      });

      const plan = res.plan;
      this.generatedPlan = plan;

      if (plan.meals) {
        this.renderMealPlan(plan);
      } else if (plan.raw_text) {
        let text = plan.raw_text;
        
        // Strategy 1: Extract JSON from markdown code blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
        if (codeBlockMatch) text = codeBlockMatch[1];
        else text = text.replace(/```(json)?/gi, '').trim();
        
        // Strategy 2: Find the outermost JSON object
        const jsonMatch = text.match(/(\{[\s\S]*\})/);
        if (jsonMatch) text = jsonMatch[1];
        
        // Strategy 3: Try to parse it
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch(e) {
          // Strategy 4: Try fixing truncated JSON by closing brackets
          let fixed = text;
          const opens = (fixed.match(/\{/g) || []).length;
          const closes = (fixed.match(/\}/g) || []).length;
          const openBr = (fixed.match(/\[/g) || []).length;
          const closeBr = (fixed.match(/\]/g) || []).length;
          for (let i = 0; i < openBr - closeBr; i++) fixed += ']';
          for (let i = 0; i < opens - closes; i++) fixed += '}';
          // Remove trailing commas before ] or }
          fixed = fixed.replace(/,\s*([\]}])/g, '$1');
          try { parsed = JSON.parse(fixed); } catch(e2) {}
        }
        
        if (parsed && parsed.meals) {
          this.renderMealPlan(parsed);
        } else if (result) {
          // Last resort: show cleaned text
          const cleanText = plan.raw_text.replace(/```(json)?/gi, '').replace(/[{}[\]"]/g, '').trim();
          result.innerHTML = `<div class="card"><div class="card-title">Your Meal Plan</div><p style="white-space:pre-wrap;line-height:1.8">${this.escapeHtml(cleanText)}</p></div>`;
        }
      }
    } catch (e) {
      const errMsg = e.message?.includes('timed out')
        ? 'AI is taking too long — please try again. It usually works on the second attempt!'
        : (e.message || 'Failed to generate meal plan. Please try again.');
      if (result) result.innerHTML = `
        <div class="alert-banner alert-danger" style="margin-bottom:12px"><i data-lucide="circle-alert"></i> ${this.escapeHtml(errMsg)}</div>
        <div style="text-align:center">
          <button class="btn btn-primary" onclick="MealPlannerPage.generate()"><i data-lucide="refresh-cw"></i> Try Again</button>
        </div>`;
      App.refreshIcons();
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="sparkles"></i> Generate Meal Plan'; App.refreshIcons(); }
  },

  renderMealPlan(plan) {
    const result = document.getElementById('meal-result');
    if (!result) return;

    const meals = plan.meals || [];
    const totals = plan.daily_totals || {};

    result.innerHTML = `
      <div class="meal-plan-output">
        <div class="meal-plan-header card">
          <h3><i data-lucide="utensils"></i> ${this.escapeHtml(plan.plan_name || 'Your Personalized Meal Plan')}</h3>
          ${plan.tips ? `<p class="meal-plan-tips"><i data-lucide="lightbulb"></i> ${this.escapeHtml(plan.tips)}</p>` : ''}
          ${totals.calories ? `
            <div class="meal-nutrition-summary">
              ${this.nutritionPill('Calories', totals.calories, 'kcal', '#6366f1')}
              ${this.nutritionPill('Protein', totals.protein, 'g', '#f43f5e')}
              ${this.nutritionPill('Carbs', totals.carbs, 'g', '#f59e0b')}
              ${this.nutritionPill('Fat', totals.fat, 'g', '#10b981')}
            </div>` : ''}
        </div>

        <div class="meal-cards-grid">
          ${meals.map((meal, i) => `
            <div class="card meal-recipe-card" style="animation-delay:${i * 0.15}s">
              <div class="meal-recipe-type">${this.getMealEmoji(meal.type)} ${this.escapeHtml((meal.type || 'meal').toUpperCase())}</div>
              <h4 class="meal-recipe-name">${this.escapeHtml(meal.name)}</h4>
              <div class="meal-recipe-meta">
                <span><i data-lucide="clock"></i> ${this.escapeHtml(meal.prep_time || '15 mins')}</span>
              </div>
              <div class="meal-recipe-section">
                <strong>Ingredients</strong>
                <ul>${(meal.ingredients || []).map(ing => `<li>${this.escapeHtml(ing)}</li>`).join('')}</ul>
              </div>
              <div class="meal-recipe-section">
                <strong>Instructions</strong>
                <ol>${(meal.instructions || []).map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}</ol>
              </div>
              ${meal.nutrition ? `
                <div class="meal-recipe-nutrition">
                  <span class="meal-macro" style="--color:#6366f1">${meal.nutrition.calories || 0} cal</span>
                  <span class="meal-macro" style="--color:#f43f5e">${meal.nutrition.protein || 0}g protein</span>
                  <span class="meal-macro" style="--color:#f59e0b">${meal.nutrition.carbs || 0}g carbs</span>
                  <span class="meal-macro" style="--color:#10b981">${meal.nutrition.fat || 0}g fat</span>
                </div>` : ''}
            </div>`).join('')}
        </div>

        <button class="btn btn-secondary btn-full" style="margin-top:18px" onclick="PdfExport.exportMealPlan(MealPlannerPage.generatedPlan)">
          <i data-lucide="download"></i> Download Meal Plan as PDF
        </button>
      </div>`;

    App.refreshIcons();
  },

  nutritionPill(label, value, unit, color) {
    return `<div class="nutrition-pill" style="--pill-color:${color}">
      <span class="nutrition-pill-value">${value}</span>
      <span class="nutrition-pill-label">${label} (${unit})</span>
    </div>`;
  },

  getMealEmoji(type) {
    const map = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
    return map[(type || '').toLowerCase()] || '🍽️';
  },

  escapeHtml(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },
};
