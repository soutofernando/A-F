'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { importGiftsFromText, type GiftImportResult } from '@/app/admin/presentes/import/actions';
import { GIFT_CATEGORY_IDS } from '@/lib/gift-categories';
import { Card, Checkbox, PageHeader, SelectField, TextField } from '@/components/admin/ui';

const TEMPLATE = `nome;preço;link;categoria;imagem
Jogo de panelas;299,90;https://loja.exemplo/produto;Cozinha;
Travesseiro memory;189,00;https://loja.exemplo/outro;Casa;https://cdn.exemplo/foto.jpg`;

export function GiftImportForm() {
  const [result, setResult] = useState<GiftImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get('rows') ?? '');
    const defaultCategory = String(formData.get('default_category') ?? 'Casa');
    const discoverImages = formData.get('discover_images') === 'on';
    const pixEnabled = formData.get('pix_enabled') === 'on';
    const cardEnabled = formData.get('card_enabled') === 'on';

    startTransition(async () => {
      const next = await importGiftsFromText({
        text,
        defaultCategory,
        discoverImages,
        pixEnabled,
        cardEnabled,
      });
      setResult(next);
    });
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        kicker="PRESENTES"
        title="importar lista"
        subtitle="Cole uma planilha ou CSV com nome, preço e link da loja. As fotos podem vir de uma coluna extra ou do preview da página do produto."
      />

      <p style={{ marginBottom: 20, fontSize: 13, color: 'rgba(239,231,219,.55)' }}>
        <Link href="/admin/presentes" style={{ color: 'var(--gold-soft)' }}>
          ← voltar para presentes
        </Link>
      </p>

      {result ? (
        <Card title="Resultado">
          <p style={{ margin: '0 0 12px', fontSize: 14 }}>
            <strong>{result.imported}</strong> presente(s) cadastrado(s).
            {result.skippedImages > 0 ? (
              <>
                {' '}
                <span style={{ color: 'rgba(239,231,219,.65)' }}>
                  {result.skippedImages} sem foto (loja bloqueou download ou não havia imagem).
                </span>
              </>
            ) : null}
          </p>
          {result.parseErrors.length > 0 && (
            <ul style={{ margin: '12px 0', paddingLeft: 18, fontSize: 13, color: '#e08e8e' }}>
              {result.parseErrors.map((err) => (
                <li key={`p-${err.line}`}>
                  Linha {err.line}: {err.message}
                </li>
              ))}
            </ul>
          )}
          {result.rowErrors.length > 0 && (
            <ul style={{ margin: '12px 0', paddingLeft: 18, fontSize: 13, color: '#e08e8e' }}>
              {result.rowErrors.map((err) => (
                <li key={`r-${err.line}-${err.title}`}>
                  Linha {err.line} ({err.title}): {err.message}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-gold"
            style={{ marginTop: 8 }}
            onClick={() => setResult(null)}
          >
            importar outro lote
          </button>
        </Card>
      ) : (
        <Card title="Colar planilha">
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
            <TextField
              label="Linhas (CSV ou copiado do Excel)"
              name="rows"
              rows={14}
              placeholder={TEMPLATE}
              hint="Separador: ponto e vírgula, vírgula ou tab. Primeira linha pode ser cabeçalho (nome, preço, link, categoria, imagem)."
            />

            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <SelectField
                label="Categoria padrão"
                name="default_category"
                options={[...GIFT_CATEGORY_IDS]}
                defaultValue="Casa"
                hint="Usada quando a linha não traz categoria."
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Checkbox
                label="Buscar foto automaticamente (og:image da página do link)"
                name="discover_images"
                defaultChecked
              />
              <Checkbox label="Aceita PIX" name="pix_enabled" defaultChecked />
              <Checkbox label="Aceita cartão" name="card_enabled" defaultChecked />
            </div>

            <p className="italic" style={{ fontSize: 12, color: 'rgba(239,231,219,.45)', margin: 0, lineHeight: 1.5 }}>
              O link da loja fica salvo na descrição (só no admin). Lojas como Amazon às vezes bloqueiam o download da
              imagem — nesse caso, adicione a URL da foto na coluna <em>imagem</em> ou envie depois em editar presente.
            </p>

            <div>
              <button
                type="submit"
                className="admin-btn admin-btn-gold"
                disabled={pending}
                style={{
                  padding: '11px 24px',
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  fontSize: 10,
                  letterSpacing: '.22em',
                  textTransform: 'uppercase',
                  cursor: pending ? 'wait' : 'pointer',
                  background: 'transparent',
                  border: '1px solid var(--gold-soft)',
                  color: 'var(--gold-soft)',
                }}
              >
                {pending ? 'importando…' : 'importar presentes'}
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
