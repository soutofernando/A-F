/**
 * Taxas do Mercado Pago variam por conta, prazo de recebimento e parcelamento.
 * @see https://www.mercadopago.com.br/blog/oferecer-pagamentos-12x-sem-acrescimos-mercado-pago
 *
 * - buyer (parcelado comprador, padrão MP): juros de parcelas vão para o convidado; você embute só a taxa da venda (ex. ~5% no crédito à vista).
 * - seller (parcelado vendedor / sem juros): você absorve financiamento; quanto mais parcelas o convidado usa, maior a taxa — estimamos pelo máximo de parcelas oferecido.
 */

const DEFAULT_FEE_RATE = 0.05;
const DEFAULT_FEE_AT_12X = 0.16;

export type InstallmentFinancingMode = 'buyer' | 'seller';

export function installmentFinancingMode(): InstallmentFinancingMode {
  const raw = process.env.MERCADOPAGO_INSTALLMENT_FINANCING?.trim().toLowerCase();
  if (raw === 'seller' || raw === 'vendedor' || raw === 'store') return 'seller';
  return 'buyer';
}

export function maxCardInstallments() {
  const raw = process.env.MERCADOPAGO_CARD_MAX_INSTALLMENTS?.trim();
  const n = raw ? Number(raw) : 6;
  if (!Number.isFinite(n)) return 6;
  return Math.min(12, Math.max(1, Math.floor(n)));
}

/** Mercado Pago exige cerca de R$ 5 por parcela. Abaixo disso o botão Pagar fica cinza. */
const MIN_INSTALLMENT_BRL = 5;

export function cardInstallmentLimit(amountReais: number, cap = maxCardInstallments()) {
  if (!Number.isFinite(amountReais) || amountReais < MIN_INSTALLMENT_BRL) return 1;
  return Math.min(cap, Math.max(1, Math.floor(amountReais / MIN_INSTALLMENT_BRL)));
}

export function cardFeeRate() {
  const raw = process.env.MERCADOPAGO_CARD_FEE_RATE?.trim();
  if (!raw) return DEFAULT_FEE_RATE;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) return DEFAULT_FEE_RATE;
  return rate;
}

function cardFeeRateAtMaxInstallments() {
  const raw = process.env.MERCADOPAGO_CARD_FEE_RATE_AT_MAX_INSTALLMENTS?.trim();
  if (!raw) return DEFAULT_FEE_AT_12X;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) return DEFAULT_FEE_AT_12X;
  return rate;
}

/** Percentual total retido pelo MP sobre o valor cobrado (pior caso para o modo seller). */
export function merchantFeeRate() {
  if (installmentFinancingMode() === 'buyer') {
    return cardFeeRate();
  }
  const feeAt1 = cardFeeRate();
  const feeAt12 = cardFeeRateAtMaxInstallments();
  const maxInst = maxCardInstallments();
  if (maxInst <= 1) return feeAt1;
  const t = (maxInst - 1) / 11;
  return feeAt1 + (feeAt12 - feeAt1) * t;
}

/** Valor em centavos que o convidado paga no cartão para você receber `giftCents` líquidos. */
export function cardChargeCentsFromGift(giftCents: number, feeRate = merchantFeeRate()) {
  if (giftCents <= 0) return giftCents;
  return Math.ceil(giftCents / (1 - feeRate));
}

export function formatBrlFromCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function cardCheckoutFeeNote() {
  const max = maxCardInstallments();
  if (installmentFinancingMode() === 'buyer') {
    return `Até ${max}x no Mercado Pago. Os juros do parcelamento são do convidado; o total acima cobre só a taxa da operação para vocês receberem o valor do presente.`;
  }
  return `Até ${max}x sem acréscimo para o convidado (parcelado loja). O total acima inclui taxa estimada do Mercado Pago, inclusive se alguém parcelar em ${max}x. Ajuste as variáveis no servidor conforme o simulador de taxas da sua conta.`;
}
