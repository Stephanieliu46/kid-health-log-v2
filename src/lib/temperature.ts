import type { TemperatureUnit } from "./temperature-unit-store";

export const CELSIUS_SLIDER_MIN = 37;
export const CELSIUS_SLIDER_MAX = 42;
export const CELSIUS_SLIDER_STEP = 0.1;
export const DEFAULT_TEMP_C = 37.5;

export const FEVER_CHART_Y_MIN_C = 35;
export const FEVER_CHART_Y_MAX_C = 41.5;

const C_SCALE_TICKS_C = [37, 38, 39, 40, 41, 42] as const;

export function normalizeTempUnit(unit?: TemperatureUnit): TemperatureUnit {
  return unit === "fahrenheit" ? "fahrenheit" : "celsius";
}

export function cToF(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function fToC(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function convertTemp(
  value: number,
  fromUnit: TemperatureUnit,
  toUnit: TemperatureUnit,
): number {
  if (fromUnit === toUnit) return value;
  return fromUnit === "celsius" ? cToF(value) : fToC(value);
}

export function toCelsius(value: number, unit: TemperatureUnit): number {
  return unit === "fahrenheit" ? fToC(value) : value;
}

export function getTempUnitSymbol(unit: TemperatureUnit): string {
  return unit === "fahrenheit" ? "°F" : "°C";
}

export function formatLogTemp(
  temp: number | null,
  storedUnit: TemperatureUnit,
  displayUnit: TemperatureUnit,
  options?: { decimals?: number; withUnit?: boolean },
): string {
  if (temp === null) return "Not Taken";
  const decimals = options?.decimals ?? 1;
  const value = convertTemp(temp, storedUnit, displayUnit);
  if (options?.withUnit === false) {
    return value.toFixed(decimals);
  }
  return `${value.toFixed(decimals)}${getTempUnitSymbol(displayUnit)}`;
}

export function getSliderConfig(unit: TemperatureUnit) {
  if (unit === "fahrenheit") {
    return {
      min: convertTemp(CELSIUS_SLIDER_MIN, "celsius", "fahrenheit"),
      max: convertTemp(CELSIUS_SLIDER_MAX, "celsius", "fahrenheit"),
      step: 0.1,
      default: convertTemp(DEFAULT_TEMP_C, "celsius", "fahrenheit"),
    };
  }
  return {
    min: CELSIUS_SLIDER_MIN,
    max: CELSIUS_SLIDER_MAX,
    step: CELSIUS_SLIDER_STEP,
    default: DEFAULT_TEMP_C,
  };
}

export function getFeverChartDomain(unit: TemperatureUnit): [number, number] {
  return [
    convertTemp(FEVER_CHART_Y_MIN_C, "celsius", unit),
    convertTemp(FEVER_CHART_Y_MAX_C, "celsius", unit),
  ];
}

export function getTempColorClass(temp: number | null, unit: TemperatureUnit): string {
  if (temp === null) return "text-muted-foreground";
  const celsius = toCelsius(temp, unit);
  if (celsius >= 39) return "text-fever-high";
  if (celsius >= 38) return "text-fever-mid";
  return "text-foreground";
}

export function getTemperatureScaleTicks(unit: TemperatureUnit) {
  return C_SCALE_TICKS_C.map((c) => ({
    value: convertTemp(c, "celsius", unit),
    position:
      ((c - CELSIUS_SLIDER_MIN) / (CELSIUS_SLIDER_MAX - CELSIUS_SLIDER_MIN)) * 100,
  }));
}
