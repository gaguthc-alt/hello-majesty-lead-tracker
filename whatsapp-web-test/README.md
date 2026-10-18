# Hello Majesty WhatsApp Web Detection Test

## Tujuan
Uji coba lokal melalui WhatsApp Web di Chrome untuk melihat apakah kita dapat mendeteksi:
- nomor customer pada chat yang sedang terbuka;
- nama CS dari balasan keluar, misalnya "Ya kak, dengan Kadek ada yang bisa dibantu".

## Batasan keamanan
- Tidak membuat, mengubah, atau menghapus lead.
- Tidak mengirim data ke server atau Supabase.
- Tidak mengubah aplikasi produksi, komisi, penjualan, stok, maupun Accurate.
- Hanya menyimpan snapshot deteksi terakhir di penyimpanan lokal extension Chrome.
- Pembacaan DOM WhatsApp Web dapat berubah jika WhatsApp memperbarui antarmukanya.

## Cara memasang untuk tes
1. Buka halaman repo pada branch `feature/whatsapp-web-detection-test`.
2. Unduh folder `whatsapp-web-test` sebagai bagian dari repo, lalu ekstrak ZIP repo.
3. Di Chrome buka `chrome://extensions`.
4. Aktifkan **Developer mode**.
5. Pilih **Load unpacked**, lalu pilih folder `whatsapp-web-test`.
6. Kembali ke tab WhatsApp Web dan refresh.
7. Buka chat dari nomor kedua yang belum disimpan sebagai kontak, jika memungkinkan.
8. Kirim dari nomor kedua pesan "halo kak".
9. Dari WhatsApp yang tertaut, balas dengan kalimat uji "Ya kak, dengan Kadek ada yang bisa dibantu."
10. Lihat panel **Hello Majesty · WA Test**. Tekan **Salin hasil deteksi** dan kirim hasil JSON ke percakapan ini.

Jika nomor customer ditampilkan sebagai nama kontak dan bukan nomor, uji pertama mungkin tidak menemukan nomornya. Jangan mengubah izin atau membagikan QR/kode WhatsApp. Panel ini belum terhubung ke database dan tidak membuat lead.
