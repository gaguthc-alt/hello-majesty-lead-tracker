-- Make partner capital settlement transfer reference optional.
-- Transfer proof upload and Management authorization remain required.
CREATE OR REPLACE FUNCTION public.record_partner_settlement_transfer_with_account(
  p_settlement_id uuid,
  p_cash_account_id uuid,
  p_reference text,
  p_proof_note text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v public.partner_settlements%rowtype;
  v_actor uuid := auth.uid();
  v_liability uuid;
  v_cash_type text;
  v_journal jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_profiles tp
    WHERE tp.user_id=v_actor AND tp.active AND tp.is_management
  ) THEN
    RAISE EXCEPTION 'Hanya Management yang dapat mencatat transfer';
  END IF;

  SELECT * INTO v FROM public.partner_settlements
  WHERE id=p_settlement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement tidak ditemukan'; END IF;
  IF v.status <> 'PARTNER_CONFIRMED' THEN
    RAISE EXCEPTION 'Settlement harus dikonfirmasi mitra terlebih dahulu';
  END IF;
  IF v.settlement_type <> 'CAPITAL' THEN
    RAISE EXCEPTION 'Fungsi ini hanya untuk settlement modal; profit sharing memerlukan alur jurnal terpisah';
  END IF;
  IF v.amount IS NULL OR v.amount <= 0 THEN
    RAISE EXCEPTION 'Nominal settlement tidak valid';
  END IF;

  -- Nomor referensi transfer opsional.
  SELECT account_type INTO v_cash_type
  FROM public.accounting_accounts
  WHERE id=p_cash_account_id AND active=true;
  IF NOT FOUND OR upper(coalesce(v_cash_type,'')) <> 'ASSET' THEN
    RAISE EXCEPTION 'Pilih akun kas/bank aktif bertipe ASSET';
  END IF;

  SELECT m.capital_liability_account_id INTO v_liability
  FROM public.partner_account_mappings m
  JOIN public.accounting_accounts a
    ON a.id=m.capital_liability_account_id
   AND a.active=true
   AND upper(a.account_type)='LIABILITY'
  WHERE lower(trim(m.partner_name))=lower(trim(v.partner_name))
    AND lower(trim(m.outlet))=lower(trim(v.outlet))
    AND m.active=true;
  IF v_liability IS NULL THEN
    RAISE EXCEPTION 'Akun hutang modal belum dipetakan/aktif untuk mitra dan outlet ini';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.source_type='PARTNER_CAPITAL_SETTLEMENT'
      AND je.source_id=p_settlement_id
  ) THEN
    RAISE EXCEPTION 'Jurnal untuk settlement ini sudah ada; transfer tidak dicatat ulang';
  END IF;

  v_journal := public.create_inventory_journal(
    'PARTNER_CAPITAL_SETTLEMENT',
    p_settlement_id,
    v.settlement_date::timestamptz,
    'Pembayaran modal '||v.partner_name||' - '||v.outlet,
    jsonb_build_array(
      jsonb_build_object('account_id',v_liability,'debit',v.amount,'credit',0,'description','Pelunasan hutang modal '||v.partner_name),
      jsonb_build_object('account_id',p_cash_account_id,'debit',0,'credit',v.amount,'description','Transfer modal kepada '||v.partner_name||' - sumber dana terpilih Management')
    )
  );

  UPDATE public.partner_settlements
  SET status='TRANSFER_SENT',
      transfer_sent_by=v_actor,
      transfer_sent_at=now(),
      transfer_reference=nullif(trim(p_reference),''),
      transfer_proof_note=nullif(trim(p_proof_note),''),
      cash_account_id=p_cash_account_id
  WHERE id=p_settlement_id;

  RETURN jsonb_build_object(
    'settlement_id',p_settlement_id,
    'status','TRANSFER_SENT',
    'amount',v.amount,
    'cash_account_id',p_cash_account_id,
    'journal',v_journal
  );
END;
$function$;
