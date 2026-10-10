/* HELLO MAJESTY — Direct customer buyback / no lead */
(function(){
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let products=[];
 window.hmOpenDirectBuyback=async function(){
   if(!window.sb||!window.profile)return alert('Sesi belum siap. Silakan refresh aplikasi.');
   const mb=$('mb'),modal=$('modal');
   if(!mb||!modal)return alert('Form Barang Masuk belum siap.');
   mb.innerHTML='<div class="box"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">📥 Pengajuan Barang Masuk — Jual HP ke Majesty</h3><button type="button" class="secondary" onclick="closeModal()">Tutup ✕</button></div><div class="small">Untuk customer walk-in atau Hunter tanpa Lead. Pengajuan wajib disetujui Management/Fasilitator sebelum HP menjadi READY.</div><label>Nama Customer *</label><input id="dbCustomer" placeholder="Nama pemilik HP"><label>Kategori HP *</label><select id="dbCategory"><option value="">Pilih kategori</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_SECOND">Android Second</option></select><label>Produk / Model *</label><select id="dbProduct" disabled><option value="">Pilih kategori terlebih dahulu</option></select><label>IMEI 1 *</label><input id="dbImei1" inputmode="numeric" maxlength="15" placeholder="15 digit angka"><label>IMEI 2 / EID (opsional)</label><input id="dbImei2" inputmode="numeric" placeholder="15 digit atau EID 32 digit"><label>Warna *</label><input id="dbColor" placeholder="Contoh: Black / Pink"><div id="dbIphoneFields" class="hidden"><label>Grade</label><select id="dbGrade"><option value="">Pilih grade</option><option>A</option><option>B</option><option>C</option></select><label>Battery Health (%) *</label><input id="dbBh" type="number" min="0" max="100" placeholder="0–100"></div><label>Kondisi</label><input id="dbCondition" placeholder="Kondisi unit"><label>Kelengkapan</label><input id="dbCompleteness" placeholder="Unit, box, kabel, dll."><label>Minus</label><textarea id="dbMinus" placeholder="Catat minus unit"></textarea><label>Harga Beli dari Customer / Modal *</label><input id="dbCost" type="number" min="1" placeholder="Nominal yang disepakati"><label>Harga Jual Rencana *</label><input id="dbPrice" type="number" min="1" placeholder="Rencana harga jual"><label>Catatan / Pembayaran</label><textarea id="dbNotes" placeholder="Catatan pengecekan dan pembayaran"></textarea><div class="row" style="margin-top:12px"><button type="button" class="success" id="dbSubmit">Ajukan Persetujuan</button><button type="button" class="secondary" onclick="closeModal()">Batal</button></div></div>';
   modal.classList.remove('hidden');
   const res=await window.sb.from('product_master').select('id,category,product,variant,color,active').eq('active',true).order('product');
   if(res.error){alert('Master Produk gagal dimuat: '+res.error.message);return;}
   products=(res.data||[]).filter(p=>['IPHONE_SECOND','ANDROID_SECOND','STOCK_SECOND_MAJESTY_CELL'].includes(String(p.category||'').toUpperCase())||/\bSECOND\b/i.test(p.product||''));
   $('dbCategory').onchange=()=>{const cat=$('dbCategory').value;const iphone=cat==='IPHONE_SECOND';$('dbIphoneFields').classList.toggle('hidden',!iphone);const rows=products.filter(p=>{const pc=String(p.category||'').toUpperCase(),name=String(p.product||'').toUpperCase(),isIphone=/IPHONE/.test(name)||pc==='IPHONE_SECOND';return iphone?isIphone:cat==='ANDROID_SECOND'?!isIphone:false;});$('dbProduct').innerHTML='<option value="">'+(rows.length?'Pilih produk':'Tidak ada produk Second aktif')+'</option>'+rows.map(p=>'<option value="'+esc(p.id)+'">'+esc([p.product,p.variant,p.color].filter(Boolean).join(' — '))+'</option>').join('');$('dbProduct').disabled=!cat;};
   $('dbSubmit').onclick=async()=>{
     const customer=$('dbCustomer').value.trim(),category=$('dbCategory').value,productId=$('dbProduct').value;
     const imei1=$('dbImei1').value.trim(),imei2=$('dbImei2').value.trim(),cost=Number($('dbCost').value||0),price=Number($('dbPrice').value||0),bh=$('dbBh')?.value;
     if(!customer)return alert('Nama customer wajib diisi.');
     if(!category||!productId)return alert('Kategori dan produk wajib dipilih.');
     if(!/^\d{15}$/.test(imei1))return alert('IMEI 1 harus 15 digit angka.');
     if(imei2&&!/^(\d{15}|\d{32})$/.test(imei2))return alert('IMEI 2 harus 15 digit atau EID 32 digit.');
     if(!$('dbColor').value.trim())return alert('Warna wajib diisi.');
     if(cost<=0||price<=0)return alert('Harga beli dan harga jual rencana wajib diisi.');
     if(category==='IPHONE_SECOND'&&(!bh||Number(bh)<0||Number(bh)>100))return alert('Battery Health iPhone wajib diisi antara 0–100.');
     const btn=$('dbSubmit');btn.disabled=true;btn.textContent='Mengirim pengajuan…';
     try{
       const r=await window.sb.rpc('set_direct_buyback_closing',{p_customer_name:customer,p_product_id:productId,p_imei_1:imei1,p_imei_2:imei2||null,p_color:$('dbColor').value.trim(),p_grade:category==='IPHONE_SECOND'?($('dbGrade').value||null):null,p_battery_health:category==='IPHONE_SECOND'?Number(bh):null,p_condition:$('dbCondition').value.trim()||null,p_completeness:$('dbCompleteness').value.trim()||null,p_minus:$('dbMinus').value.trim()||null,p_cost:cost,p_asking_price:price,p_notes:$('dbNotes').value.trim()||null,p_outlet:window.profile.outlet||null});
       if(r.error)throw r.error;
       if(typeof window.closeModal==='function')window.closeModal();else modal.classList.add('hidden');
       alert('✅ Pengajuan Jual HP berhasil. Hunter tercatat dan stok berstatus PENDING APPROVAL. HP baru menjadi READY setelah disetujui.');
     }catch(e){alert('Pengajuan gagal: '+(e?.message||'Terjadi kesalahan'));btn.disabled=false;btn.textContent='Ajukan Persetujuan';}
   };
 };
})();