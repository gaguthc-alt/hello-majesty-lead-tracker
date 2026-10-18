# Hello Majesty WhatsApp Web Detection Test

## Tujuan
Uji lokal pada WhatsApp Web untuk mendeteksi nomor customer dan nama CS dari balasan yang tampak di chat aktif.

## Batasan keamanan
- Tidak membuat, mengubah, atau menghapus lead.
- Tidak mengirim data ke server atau Supabase.
- Tidak mengubah aplikasi produksi, komisi, penjualan, stok, atau Accurate.
- Tidak melakukan pemindaian otomatis. Pemindaian hanya berjalan saat tombol **Periksa chat sekarang** ditekan.
- Pembacaan DOM WhatsApp Web dapat berubah sewaktu-waktu.

## Cara memasang versi terbaru
1. Pastikan extension versi lama dinonaktifkan atau dihapus di `chrome://extensions`.
2. Unduh ZIP branch `feature/whatsapp-web-detection-test`: https://github.com/gaguthc-alt/hello-majesty-lead-tracker/archive/refs/heads/feature/whatsapp-web-detection-test.zip
3. Ekstrak ZIP.
4. Buka `chrome://extensions`, aktifkan **Developer mode**, lalu pilih **Load unpacked**.
5. Pilih folder `whatsapp-web-test` dari hasil ekstraksi.
6. Kembali ke WhatsApp Web dan refresh halaman.
7. Buka chat dari nomor kedua, kirim pesan `halo kak`, lalu balas dari WhatsApp tertaut dengan `Ya kak, dengan Kadek ada yang bisa dibantu.`
8. Tekan **Periksa chat sekarang** pada panel.
9. Jika data terdeteksi, tekan **Salin hasil deteksi** dan tempelkan JSON ke percakapan ini.

Jika Chrome kembali macet, nonaktifkan extension dan jangan lanjutkan pengujian. Jangan pernah membagikan QR atau kode verifikasi WhatsApp.
