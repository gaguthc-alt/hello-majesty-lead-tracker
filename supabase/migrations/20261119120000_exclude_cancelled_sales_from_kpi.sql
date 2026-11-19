-- Exclude cancelled sales from all operational closing, sales and profit summaries.
-- The cancellation record remains in sales_transactions for audit/history.
do $$
declare d text;
begin
  select pg_get_functiondef('public.dashboard_target_summary()'::regprocedure) into d;
  d:=replace(d,
    'st.sold_at < ((v_month+interval ''1 month'')::timestamp at time zone ''Asia/Makassar'')',
    'st.sold_at < ((v_month+interval ''1 month'')::timestamp at time zone ''Asia/Makassar'') and not coalesce(st.is_cancelled,false)');
  execute d;

  select pg_get_functiondef('public.home_performance_summary(timestamptz,timestamptz,text,text,boolean)'::regprocedure) into d;
  d:=replace(d,'st.sold_at<p_end','st.sold_at<p_end AND NOT coalesce(st.is_cancelled,false)');
  execute d;

  select pg_get_functiondef('public.outlet_sales_closing_count(timestamptz,timestamptz,text)'::regprocedure) into d;
  d:=replace(d,'st.sold_at<p_end;','st.sold_at<p_end AND NOT coalesce(st.is_cancelled,false);');
  execute d;

  select pg_get_functiondef('public.management_performance_sales(timestamptz,timestamptz)'::regprocedure) into d;
  d:=replace(d,'st.sold_at<p_end','st.sold_at<p_end AND NOT coalesce(st.is_cancelled,false)');
  execute d;

  select pg_get_functiondef('public.accounting_profit_loss(date,date)'::regprocedure) into d;
  d:=replace(d,'where sold_at>=p_start::timestamptz and sold_at<(p_end+1)::timestamptz',
    'where sold_at>=p_start::timestamptz and sold_at<(p_end+1)::timestamptz and not coalesce(is_cancelled,false)');
  execute d;

  select pg_get_functiondef('public.finance_dashboard_summary(date,date)'::regprocedure) into d;
  d:=replace(d,'and sold_at < (p_end + 1)::timestamptz;',
    'and sold_at < (p_end + 1)::timestamptz and not coalesce(is_cancelled,false);');
  execute d;

  select pg_get_functiondef('public.hunter_commission_report(date,date,text)'::regprocedure) into d;
  d:=replace(d,'st.sold_at<(p_end_date+1)','st.sold_at<(p_end_date+1) AND NOT coalesce(st.is_cancelled,false)');
  execute d;

  select pg_get_functiondef('public.my_performance_report(date,date)'::regprocedure) into d;
  d:=replace(d,'st.sold_at<v_end and upper(coalesce(st.customer_source,''''))',
    'st.sold_at<v_end and not coalesce(st.is_cancelled,false) and upper(coalesce(st.customer_source,''''))');
  execute d;

  select pg_get_functiondef('public.management_performance_report(date,date,text)'::regprocedure) into d;
  d:=replace(d,'st.sold_at<v_end and upper(coalesce(st.customer_source,''''))',
    'st.sold_at<v_end and not coalesce(st.is_cancelled,false) and upper(coalesce(st.customer_source,''''))');
  execute d;
end $$;
