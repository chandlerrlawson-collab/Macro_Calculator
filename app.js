// Beginner guide: JavaScript adds behavior to the page. The browser exposes HTML as the Document Object Model (DOM), a tree of page elements that this code can find and update. Strict mode asks JavaScript to catch some common mistakes.
'use strict';

// This helper finds one page element by its unique id. const declares a name that will not be reassigned.
const byId = (id) => document.getElementById(id);
// This text is the label used to find the calculator's saved choices in localStorage, the browser's small on-device storage.
const preferenceKey = 'good-measure-preferences-v1';

// A function is a named set of steps. This one reads saved choices. JSON (JavaScript Object Notation) is a text format used to store structured data. try/catch handles storage or saved-data errors safely.
function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}');
    return {
      units: saved.units === 'metric' ? 'metric' : 'us',
      goal: ['maintain', 'lose', 'gain'].includes(saved.goal) ? saved.goal : 'maintain'
    };
  } catch {
    return { units: 'us', goal: 'maintain' };
  }
}

// Load the saved unit and goal once when the page starts; let is used for values that can change. Body measurements are not stored.
const preferences = readPreferences();
let units = preferences.units;
let goal = preferences.goal;
let dailyCalories = null;

// Save only the unit and goal choices. JSON.stringify turns the object into text for localStorage.
function savePreferences() {
  try {
    localStorage.setItem(preferenceKey, JSON.stringify({ units, goal }));
  } catch {
    // The calculator still works if browser storage is unavailable.
  }
}

// These objects group the three percentage fields and their matching sliders. An object stores named values together; the names here identify protein, carbohydrates, and fat.
const macroInputs = {
  protein: byId('proteinInput'),
  carbs: byId('carbsInput'),
  fat: byId('fatInput')
};
const macroRanges = {
  protein: byId('proteinRange'),
  carbs: byId('carbsRange'),
  fat: byId('fatRange')
};
const macroLimits = {
  protein: [10, 35],
  carbs: [45, 65],
  fat: [20, 35]
};

// Read the current macro percentages from the form and convert their text values to numbers.
function getMacroSplit() {
  return Object.fromEntries(
    Object.entries(macroInputs).map(([name, input]) => [name, Number(input.value)])
  );
}

// Check that each percentage is within its allowed range and that all three add up to 100.
function isValidMacroSplit(values) {
  const numbers = Object.values(values);
  return numbers.every(Number.isFinite) &&
    values.protein >= macroLimits.protein[0] && values.protein <= macroLimits.protein[1] &&
    values.carbs >= macroLimits.carbs[0] && values.carbs <= macroLimits.carbs[1] &&
    values.fat >= macroLimits.fat[0] && values.fat <= macroLimits.fat[1] &&
    numbers.reduce((sum, value) => sum + value, 0) === 100;
}

// Keep the percentage total, sliders, and warning message in sync whenever a macro field changes.
function updateMacroControls(changedInput) {
  const values = getMacroSplit();
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  const valid = isValidMacroSplit(values);
  const totalLabel = byId('percentTotal');

  totalLabel.textContent = `Total: ${total}%`;
  totalLabel.classList.toggle('valid', valid);
  totalLabel.classList.toggle('invalid', !valid);

  for (const [name, value] of Object.entries(values)) {
    if (changedInput !== `${name}Input`) macroRanges[name].value = value;
    byId(`${name}Pct`).textContent = `${value}%`;
  }

  byId('adjustTotal').textContent = `${total}% total`;
  byId('warningTotal').textContent = Number.isFinite(total) ? total : '—';
  byId('macroWarning').classList.toggle('show', !valid);
  if (dailyCalories !== null) updateMacroResults();
}

// Update labels and input settings for US or metric units. The optional true value clears measurements so numbers entered in one unit system are not mistaken for another.
function applyUnitSettings(clearMeasurements = false) {
  const metric = units === 'metric';

  document.querySelectorAll('[data-units]').forEach((item) => {
    const selected = item.dataset.units === units;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });

  if (clearMeasurements) {
    byId('heightA').value = '';
    byId('heightB').value = '';
    byId('weight').value = '';
  }
  byId('heightA').placeholder = metric ? 'e.g. 170' : '5';
  byId('heightA').setAttribute('aria-label', metric ? 'Height centimeters' : 'Height feet');
  byId('heightUnitA').textContent = metric ? 'cm' : 'ft';
  byId('heightBWrap').classList.toggle('is-hidden', metric);
  byId('heightB').required = !metric;
  byId('weight').placeholder = metric ? 'e.g. 75' : 'e.g. 165';
  byId('weightUnit').textContent = metric ? 'kg' : 'lb';
}

// Mark the selected goal button and update its accessibility state for screen readers.
function applyGoalSettings() {
  document.querySelectorAll('[data-goal]').forEach((item) => {
    const selected = item.dataset.goal === goal;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
}

// Convert each calorie share into grams and update the result numbers and visual progress bars.
function updateMacroResults() {
  const values = getMacroSplit();
  const valid = isValidMacroSplit(values);

  for (const [name, percentage] of Object.entries(values)) {
    const caloriesPerGram = name === 'fat' ? 9 : 4;
    const grams = Math.round(dailyCalories * percentage / 100 / caloriesPerGram);
    byId(`${name}Grams`).textContent = valid ? grams : '—';
    byId(`${name}Bar`).value = Number.isFinite(percentage)
      ? Math.max(0, Math.min(100, percentage))
      : 0;
  }
}

// Listen for edits to percentage fields and sliders. An event listener is a function the browser runs in response to an action such as typing or moving a slider.
for (const [name, input] of Object.entries(macroInputs)) {
  input.addEventListener('input', () => updateMacroControls(`${name}Input`));
  macroRanges[name].addEventListener('input', () => {
    input.value = macroRanges[name].value;
    updateMacroControls(`${name}Range`);
  });
}

// When a unit button is clicked, change the unit setting, update the form, and save that preference.
document.querySelectorAll('[data-units]').forEach((button) => {
  button.addEventListener('click', () => {
    units = button.dataset.units;
    applyUnitSettings(true);
    savePreferences();
  });
});

// When a goal button is clicked, update the selected goal and save it.
document.querySelectorAll('[data-goal]').forEach((button) => {
  button.addEventListener('click', () => {
    goal = button.dataset.goal;
    applyGoalSettings();
    savePreferences();
  });
});

// When the form is submitted, validate the entries, estimate daily calories, and display macro targets. The Mifflin–St Jeor equation estimates resting calories; an activity multiplier and goal adjustment turn that into a daily estimate.
byId('calculator').addEventListener('submit', (event) => {
  event.preventDefault();

  const age = Number(byId('age').value);
  const weightRaw = Number(byId('weight').value);
  const heightA = Number(byId('heightA').value);
  const heightB = units === 'us' ? Number(byId('heightB').value || 0) : 0;
  const weightKg = units === 'us' ? weightRaw / 2.20462 : weightRaw;
  const heightCm = units === 'us' ? (heightA * 12 + heightB) * 2.54 : heightA;
  const macroSplit = getMacroSplit();
  const error = byId('formError');
  let message = '';

  if (!Number.isFinite(age) || age < 18 || age > 100) {
    message = 'Please enter an age from 18 to 100. This calculator is for adults.';
  } else if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500 ||
             !Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
    message = 'Please enter a valid weight and height.';
  } else if (units === 'us' &&
             (heightA < 3 || heightA > 8 || heightB < 0 || heightB > 11)) {
    message = 'Please check your height in feet and inches.';
  } else if (!isValidMacroSplit(macroSplit)) {
    message = 'Keep protein at 10–35%, carbs at 45–65%, and fat at 20–35%. The percentages must total 100%.';
  }

  if (message) {
    error.textContent = message;
    error.classList.add('show');
    return;
  }

  error.textContent = '';
  error.classList.remove('show');

  // Calculate the estimate, then update the result panel with the chosen goal and calorie amount.
  const maleFormula = byId('sex').value === 'male';
  const restingCalories = 10 * weightKg + 6.25 * heightCm - 5 * age + (maleFormula ? 5 : -161);
  const activityFactor = Number(byId('activity').value);
  const goalFactor = goal === 'lose' ? 0.9 : goal === 'gain' ? 1.1 : 1;
  dailyCalories = Math.round(restingCalories * activityFactor * goalFactor / 10) * 10;

  byId('calorieValue').textContent = dailyCalories.toLocaleString();
  byId('goalPill').textContent = goal === 'lose' ? 'Weight loss' : goal === 'gain' ? 'Weight gain' : 'Maintenance';
  byId('resultSubtitle').textContent = `Estimated from your ${goal === 'maintain' ? 'current' : goal === 'lose' ? 'weight-loss' : 'weight-gain'} goal and usual activity.`;
  byId('resultEmpty').classList.add('is-hidden');
  byId('results').classList.add('show');
  updateMacroResults();

  // On a narrow screen, move the visitor's view down to the newly displayed results.
  if (window.innerWidth <= 800) {
    byId('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

// Set up the page when it first opens, using any saved unit and goal choices.
applyUnitSettings();
applyGoalSettings();
updateMacroControls();
