import { useSyncExternalStore } from "react";

const KEY = "kidhealth.pro.v1";
const listeners = new Set<() => void>();
const paywallListeners = new Set<() => void>();
const purchasingListeners = new Set<() => void>();

let isPro = false;
let paywallOpen = false;
let purchasing = false;
let initialized = false;

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { isPro?: boolean };
    return parsed?.isPro === true;
  } catch {
    return false;
  }
}

function write(next: boolean) {
  isPro = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify({ isPro: next }));
    } catch (e) {
      console.error("[pro-store] Failed to persist:", e);
    }
  }
  listeners.forEach((l) => l());
}

function initFromStorage() {
  if (!initialized) {
    isPro = read();
    initialized = true;
  }
}

export function getIsPro(): boolean {
  initFromStorage();
  return isPro;
}

export function setPurchasing(next: boolean) {
  purchasing = next;
  purchasingListeners.forEach((l) => l());
}

export function purchasePro(): Promise<void> {
  setPurchasing(true);
  return new Promise((resolve) => {
    setTimeout(() => {
      write(true);
      setPaywallOpen(false);
      setPurchasing(false);
      resolve();
    }, 2000);
  });
}

export function setPaywallOpen(open: boolean) {
  paywallOpen = open;
  paywallListeners.forEach((l) => l());
}

export function openPaywall() {
  setPaywallOpen(true);
}

export function useIsPro(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePaywallOpen(): boolean {
  return useSyncExternalStore(subscribePaywall, getPaywallSnapshot, getPaywallServerSnapshot);
}

export function usePurchasing(): boolean {
  return useSyncExternalStore(
    subscribePurchasing,
    getPurchasingSnapshot,
    getPurchasingServerSnapshot,
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  initFromStorage();
  return isPro;
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribePaywall(listener: () => void) {
  paywallListeners.add(listener);
  return () => paywallListeners.delete(listener);
}

function getPaywallSnapshot(): boolean {
  return paywallOpen;
}

function getPaywallServerSnapshot(): boolean {
  return false;
}

function subscribePurchasing(listener: () => void) {
  purchasingListeners.add(listener);
  return () => purchasingListeners.delete(listener);
}

function getPurchasingSnapshot(): boolean {
  return purchasing;
}

function getPurchasingServerSnapshot(): boolean {
  return false;
}

export function hydrateProStore() {
  if (typeof window === "undefined") return;
  const stored = read();
  initialized = true;
  if (stored !== isPro) {
    isPro = stored;
    listeners.forEach((l) => l());
  }
}

export function resetProStore() {
  isPro = false;
  paywallOpen = false;
  purchasing = false;
  initialized = false;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
  paywallListeners.forEach((l) => l());
  purchasingListeners.forEach((l) => l());
}
