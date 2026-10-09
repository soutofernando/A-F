export const MERCADO_PAGO_SECURITY_SCRIPT = 'https://www.mercadopago.com/v2/security.js';

const DEVICE_ID = /^[A-Za-z0-9._-]{16,256}$/;

declare global {
  interface Window {
    MP_DEVICE_SESSION_ID?: string;
  }
}

/** Accepts only the session id produced by Mercado Pago's security script. */
export function mercadoPagoDeviceId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return DEVICE_ID.test(id) ? id : null;
}

export function loadMercadoPagoDeviceScript() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${MERCADO_PAGO_SECURITY_SCRIPT}"]`)) return;
  const script = document.createElement('script');
  script.src = MERCADO_PAGO_SECURITY_SCRIPT;
  script.async = true;
  script.setAttribute('view', 'checkout');
  document.head.appendChild(script);
}

export function readMercadoPagoDeviceId() {
  if (typeof window === 'undefined') return null;
  return mercadoPagoDeviceId(window.MP_DEVICE_SESSION_ID);
}

export async function waitForMercadoPagoDeviceId(timeoutMs = 2500) {
  const ready = readMercadoPagoDeviceId();
  if (ready) return ready;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const id = readMercadoPagoDeviceId();
    if (id) return id;
  }
  return null;
}
