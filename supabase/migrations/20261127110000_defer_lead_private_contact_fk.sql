-- The BEFORE INSERT privacy trigger writes the phone into lead_private_contacts
-- using NEW.id before the parent row is physically inserted. Defer the FK check
-- until transaction commit so the parent lead can be inserted in the same transaction.
ALTER TABLE public.lead_private_contacts
  DROP CONSTRAINT IF EXISTS lead_private_contacts_lead_id_fkey;

ALTER TABLE public.lead_private_contacts
  ADD CONSTRAINT lead_private_contacts_lead_id_fkey
  FOREIGN KEY (lead_id)
  REFERENCES public.leads(id)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
