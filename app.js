'use strict';

const byId = (id) => document.getElementById(id);
let units = 'us';
let goal = 'maintain';
let dailyCalories = null;

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

function getMacroSplit() {
  return Object.fromEntries(
    Object.entries(macroInputs).map(([name, input]) => [name, Number(input.value)])
  );
}

function isValidMacroSplit(values) {
  const numbers = Object.values(values);
  return numbers.every(Number.isFinite) &&
    values.protein >= macroLimits.protein[0] && values.protein <= macroLimits.protein[1] &&
    values.carbs >= macroLimits.carbs[0] && values.carbs <= macroLimits.carbs[1] &&
    values.fat >= macroLimits.fat[0] && values.fat <= macroLimits.fat[1] &&
    numbers.reduce((sum, value) => sum + value, 0) === 100;
}

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

for (const [name, input] of Object.entries(macroInputs)) {
  input.addEventListener('input', () => updateMacroControls(`${name}Input`));
  macroRanges[name].addEventListener('input', () => {
    input.value = macroRanges[name].value;
    updateMacroControls(`${name}Range`);
  });
}

document.querySelectorAll('[data-units]').forEach((button) => {
  button.addEventListener('click', () => {
    units = button.dataset.units;
    document.querySelectorAll('[data-units]').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });

    byId('heightA').value = '';
    byId('heightB').value = '';
    byId('weight').value = '';
    const metric = units === 'metric';
    byId('heightA').placeholder = metric ? 'e.g. 170' : '5';
    byId('heightA').setAttribute('aria-label', metric ? 'Height centimeters' : 'Height feet');
    byId('heightUnitA').textContent = metric ? 'cm' : 'ft';
    byId('heightBWrap').classList.toggle('is-hidden', metric);
    byId('heightB').required = !metric;
    byId('weight').placeholder = metric ? 'e.g. 75' : 'e.g. 165';
    byId('weightUnit').textContent = metric ? 'kg' : 'lb';
  });
});

document.querySelectorAll('[data-goal]').forEach((button) => {
  button.addEventListener('click', () => {
    goal = button.dataset.goal;
    document.querySelectorAll('[data-goal]').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
  });
});

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

  if (window.innerWidth <= 800) {
    byId('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

updateMacroControls();
