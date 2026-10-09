'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { claimGift, startCardCheckout, type ClaimMethod } from '@/app/presentes/[id]/actions';
import { loadMercadoPagoDeviceScript, waitForMercadoPagoDeviceId } from '@/lib/mp-device-id';

export type GiftAddress = {
  id: string;
  label: string;
  recipient: string | null;
  line: string;
};

const IconPix = () => (
  <svg className="gift-choice__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M13.2 2.4 20.4 9.6a3.6 3.6 0 0 1 0 5.1l-5.1 5.1a3.6 3.6 0 0 1-5.1 0L3 9.6a3.6 3.6 0 0 1 0-5.1l5.1-5.1a3.6 3.6 0 0 1 5.1 0Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M8.4 8.4h7.2M8.4 12h7.2M8.4 15.6h4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconCard = () => (
  <svg className="gift-choice__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.5 15.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconGift = () => (
  <svg className="gift-choice__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 10.5h16v9.5H4V10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M12 10.5v9.5M4 14h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M12 10.5c-2.2 0-4-1.2-4-3.2S9.8 4 12 4s4 1.3 4 3.3-1.8 3.2-4 3.2Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M4 10.5h16V8.5H4v2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

type Props = {
  gift: {
    id: string;
    title: string;
    category: string;
    priceLabel: string;
    cardChargeLabel: string | null;
    cardFeeNote: string | null;
    cardMaxInstallments: number;
    imageUrl: string | null;
    pixEnabled: boolean;
    cardEnabled: boolean;
    deliveryEnabled: boolean;
    taken: boolean;
    held: boolean;
  };
  pix: {
    bank: string;
    holder: string;
    payload: string | null;
    qrDataUrl: string | null;
    keyLabel: string | null;
    keyCopy: string | null;
  } | null;
  addresses: GiftAddress[];
  paymentNotice?: 'approved' | 'pending' | 'failure' | 'conflict' | null;
};

const copyWithSelection = (value: string) => {
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.focus();
  area.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(area);
  return copied;
};

const copyText = async (value: string) => {
  if (copyWithSelection(value)) return;
  await navigator.clipboard.writeText(value);
};

export function GiftClaim({ gift, pix, addresses, paymentNotice = null }: Props) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [giverName, setGiverName] = useState('');
  const [mode, setMode] = useState<'pix' | 'card' | 'item' | null>(
    gift.pixEnabled || gift.cardEnabled ? null : gift.deliveryEnabled ? 'item' : null,
  );
  const [delivery, setDelivery] = useState<string>(addresses[0]?.id ?? 'in_hand');
  const [copied, setCopied] = useState<string | null>(null);
  const [modal, setModal] = useState<ClaimMethod | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(
    paymentNotice === 'failure'
      ? 'O Mercado Pago recusou este cartão. O presente continua na lista. Use o PIX ou tente o cartão outra vez mais tarde, no aparelho em que você já costuma comprar.'
      : '',
  );
  const [done, setDone] = useState(false);

  const nameOk = giverName.trim().length >= 2;
  const pixReady = Boolean(pix?.payload);

  useEffect(() => {
    if (!gift.cardEnabled || gift.taken) return;
    loadMercadoPagoDeviceScript();
  }, [gift.cardEnabled, gift.taken]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) setModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, pending]);

  const markCopied = async (id: string, value: string) => {
    try {
      await copyText(value);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1800);
    } catch {
      setError('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };

  const openModal = (method: ClaimMethod) => {
    if (!nameOk) {
      setError('Escreva o nome de quem está dando o presente.');
      nameRef.current?.focus();
      nameRef.current?.scrollIntoView({ block: 'center' });
      return;
    }
    if (method === 'pix' && !pixReady) return;
    if (method === 'address' && !delivery) return;
    setError('');
    setModal(method);
  };

  const confirm = async () => {
    if (!modal) return;
    setPending(true);
    setError('');
    const result = await claimGift({
      giftId: gift.id,
      giverName,
      method: modal,
      addressId: modal === 'address' ? delivery : undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      setModal(null);
      return;
    }
    setModal(null);
    setDone(true);
  };

  if (paymentNotice === 'conflict') {
    return (
      <div className="gift-claim">
        <Link href="/presentes" className="gift-claim__back">
          Voltar para a lista
        </Link>
        <h1 className="serif gift-claim__title">{gift.title}</h1>
        <p className="italic gift-claim__lede">
          O pagamento foi aprovado, mas este presente já estava com outra pessoa. Fale com os noivos.
        </p>
      </div>
    );
  }

  if (gift.taken || done) {
    return (
      <div className="gift-claim">
        <Link href="/presentes" className="gift-claim__back">
          Voltar para a lista
        </Link>
        <h1 className="serif gift-claim__title">{gift.title}</h1>
        <p className="italic gift-claim__lede">
          {done
            ? `${giverName.trim()}, este presente ficou registrado no seu nome.`
            : 'Este presente já foi escolhido.'}
        </p>
      </div>
    );
  }

  if (gift.held || paymentNotice === 'pending') {
    return (
      <div className="gift-claim">
        <Link href="/presentes" className="gift-claim__back">
          Voltar para a lista
        </Link>
        <h1 className="serif gift-claim__title">{gift.title}</h1>
        <p className="italic gift-claim__lede">
          Este presente está reservado enquanto o Mercado Pago confirma o pagamento.
        </p>
      </div>
    );
  }

  const payWithCard = async () => {
    if (!nameOk) {
      setError('Escreva o nome de quem está dando o presente.');
      nameRef.current?.focus();
      nameRef.current?.scrollIntoView({ block: 'center' });
      return;
    }
    setPending(true);
    setError('');
    const deviceId = await waitForMercadoPagoDeviceId();
    const result = await startCardCheckout({ giftId: gift.id, giverName, deviceId });
    if (!result.ok) {
      setPending(false);
      setError(result.message);
      return;
    }
    window.location.assign(result.url);
  };

  const confirmLabel =
    modal === 'pix'
      ? 'Já fiz o PIX'
      : modal === 'in_hand'
        ? 'Vou entregar nas mãos'
        : 'Vou enviar para este endereço';

  return (
    <div className="gift-claim">
      <Link href="/presentes" className="gift-claim__back">
        Voltar para a lista
      </Link>

      <div className="gift-claim__photo">
        {gift.imageUrl ? <img src={gift.imageUrl} alt="" /> : null}
      </div>
      <p className="micro gift-claim__cat">{gift.category}</p>
      <h1 className="serif gift-claim__title">{gift.title}</h1>
      <p className="italic gift-claim__price">{gift.priceLabel}</p>

      <label className="gift-claim__name">
        <span>Quem está dando o presente</span>
        <input
          ref={nameRef}
          className={error && !nameOk ? 'field field-error' : 'field'}
          value={giverName}
          onChange={(event) => setGiverName(event.target.value)}
          placeholder="Seu nome"
          autoComplete="name"
          maxLength={120}
        />
        {error && !nameOk ? <p className="gift-claim__error">{error}</p> : null}
      </label>

      <div className="gift-claim__choices" role="radiogroup" aria-label="Como presentear">
        {gift.pixEnabled ? (
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'pix'}
            className={mode === 'pix' ? 'gift-choice is-on' : 'gift-choice'}
            onClick={() => setMode('pix')}
          >
            <IconPix />
            <span className="gift-choice__body">
              <strong>Enviar o valor no PIX</strong>
              <span>Copia e cola, QR Code ou a chave do telefone, no valor deste presente.</span>
            </span>
          </button>
        ) : null}
        {gift.cardEnabled ? (
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'card'}
            className={mode === 'card' ? 'gift-choice is-on' : 'gift-choice'}
            onClick={() => setMode('card')}
          >
            <IconCard />
            <span className="gift-choice__body">
              <strong>Pagar no cartão</strong>
              <span>
                {gift.cardChargeLabel
                  ? `Total no cartão ${gift.cardChargeLabel} (até ${gift.cardMaxInstallments}x no Mercado Pago).`
                  : `Até ${gift.cardMaxInstallments}x na página do Mercado Pago.`}
              </span>
            </span>
          </button>
        ) : null}
        {gift.deliveryEnabled ? (
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'item'}
            className={mode === 'item' ? 'gift-choice is-on' : 'gift-choice'}
            onClick={() => setMode('item')}
          >
            <IconGift />
            <span className="gift-choice__body">
              <strong>Entregar o presente</strong>
              <span>Envie para um endereço cadastrado ou entregue nas mãos.</span>
            </span>
          </button>
        ) : null}
      </div>
      {!gift.pixEnabled && !gift.cardEnabled && !gift.deliveryEnabled ? (
        <p className="italic gift-claim__lede">Este presente ainda não tem uma forma de presentear cadastrada.</p>
      ) : null}

      {mode === 'pix' && gift.pixEnabled ? (
        <section className="gift-claim__panel">
          {pixReady && pix ? (
            <>
              <p className="gift-claim__meta">
                {[pix.bank, pix.holder].filter(Boolean).join(' · ') || 'PIX'}
                {' · '}
                {gift.priceLabel}
              </p>
              <div className="gift-claim__copyrow">
                <textarea className="gift-claim__payload" readOnly value={pix.payload ?? ''} rows={4} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => markCopied('pix', pix.payload ?? '')}>
                  {copied === 'pix' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              {pix.qrDataUrl ? (
                <img className="gift-claim__qr" src={pix.qrDataUrl} alt="QR Code do PIX" />
              ) : null}
              {pix.keyLabel && pix.keyCopy ? (
                <div className="gift-claim__fallback">
                  <p className="gift-claim__hint italic">
                    Se o banco disser que o destinatário não existe ou que o copia e cola falhou, pague pela chave do telefone.
                  </p>
                  <p className="gift-claim__key">{pix.keyLabel}</p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => markCopied('pix-key', pix.keyCopy ?? '')}>
                    {copied === 'pix-key' ? 'Chave copiada' : 'Copiar chave'}
                  </button>
                </div>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={() => openModal('pix')}>
                Já fiz o PIX
              </button>
            </>
          ) : (
            <p className="italic gift-claim__lede">
              {gift.deliveryEnabled
                ? 'A chave PIX ainda não foi cadastrada. Dá para entregar o presente, ou pedir o código aos noivos.'
                : 'A chave PIX ainda não foi cadastrada. Peça o código aos noivos.'}
            </p>
          )}
        </section>
      ) : null}

      {mode === 'card' && gift.cardEnabled ? (
        <section className="gift-claim__panel">
          <p className="gift-claim__meta">
            {gift.cardChargeLabel ?? gift.priceLabel}
            {' · '}
            presente {gift.priceLabel}
          </p>
          {gift.cardFeeNote ? <p className="gift-claim__hint">{gift.cardFeeNote}</p> : null}
          <button type="button" className="btn btn-primary" disabled={pending} onClick={payWithCard}>
            {pending ? 'Abrindo pagamento' : 'Ir para o pagamento'}
          </button>
        </section>
      ) : null}

      {mode === 'item' && gift.deliveryEnabled ? (
        <section className="gift-claim__panel">
          <div className="gift-claim__addresses" role="radiogroup" aria-label="Onde entregar">
            <label className={delivery === 'in_hand' ? 'gift-address is-on' : 'gift-address'}>
              <input
                type="radio"
                name="delivery"
                checked={delivery === 'in_hand'}
                onChange={() => setDelivery('in_hand')}
              />
              <span>
                <strong>Entregar nas mãos</strong>
                <span>Você entrega o presente pessoalmente.</span>
              </span>
            </label>
            {addresses.map((address) => (
              <label key={address.id} className={delivery === address.id ? 'gift-address is-on' : 'gift-address'}>
                <input
                  type="radio"
                  name="delivery"
                  checked={delivery === address.id}
                  onChange={() => setDelivery(address.id)}
                />
                <span>
                  <strong>{address.label}</strong>
                  {address.recipient ? <span>{address.recipient}</span> : null}
                  <span>{address.line}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    markCopied(address.id, address.line);
                  }}
                >
                  {copied === address.id ? 'Copiado' : 'Copiar'}
                </button>
              </label>
            ))}
          </div>
          {addresses.length === 0 ? (
            <p className="italic gift-claim__hint">Nenhum endereço cadastrado ainda. A entrega nas mãos continua disponível.</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openModal(delivery === 'in_hand' ? 'in_hand' : 'address')}
          >
            {delivery === 'in_hand' ? 'Vou entregar nas mãos' : 'Vou enviar para este endereço'}
          </button>
        </section>
      ) : null}

      {error && nameOk ? <p className="gift-claim__error">{error}</p> : null}

      {modal && typeof document !== 'undefined'
        ? createPortal(
        <div className="gift-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !pending && setModal(null)}>
          <div
            className="gift-modal__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="serif gift-modal__title">
              Confirmar presente
            </h2>
            <p>
              {`Ao confirmar, este item sai da lista e fica como presenteado${
                giverName.trim() ? ` por ${giverName.trim()}` : ''
              }.`}
            </p>
            <div className="gift-modal__actions">
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setModal(null)}>
                Voltar
              </button>
              <button type="button" className="btn btn-primary" disabled={pending} onClick={confirm}>
                {pending ? 'Registrando' : confirmLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
