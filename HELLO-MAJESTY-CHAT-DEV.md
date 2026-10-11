# Hello Majesty Chat — Development Prototype

Branch: `feature/hello-majesty-chat`

## Tujuan
Prototype chat internal Hello Majesty dengan alur:
Customer → Chat → Lead baru → CS claim → CS handle.

## Keamanan tahap ini
- Tidak mengubah tabel Supabase.
- Tidak menulis ke `public.leads`.
- Tidak mengubah login, finance, stock, sales, closing, atau permission produksi.
- Data demo hanya disimpan di browser `localStorage`.
- Perubahan berada di branch development, bukan `main`.

## Alur berikutnya
1. Validasi tampilan dan UX chat.
2. Tambahkan tabel Chat baru secara additive dengan RLS.
3. Hubungkan chat masuk ke lead tanpa mengubah struktur existing lead terlebih dahulu.
4. Tambahkan notification ke CS.
5. Setelah stabil, integrasikan handover/closing existing.

## Catatan
Prototype ini sengaja menggunakan data demo agar kita dapat menguji UX tanpa risiko terhadap database produksi.
