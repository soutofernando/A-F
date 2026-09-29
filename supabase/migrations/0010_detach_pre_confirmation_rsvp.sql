-- Pré-confirmação (/confirmar) e presença na festa (RSVP na home) são fluxos separados.

drop trigger if exists confirmations_sync_rsvp on public.confirmations;
