/* HELLO MAJESTY PAYROLL — standalone module
   Initial shell only. Payroll calculations/data will be added in later steps.
*/
(function(){
  'use strict';

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  window.hmOpenPayroll = function(){
    const panel=document.getElementById('hmMenuPanel');
    const body=document.getElementById('hmMenuPanelBody');
    const title=document.getElementById('hmMenuPanelTitle');
    const modal=document.getElementById('modal');
    const mb=document.getElementById('mb');

    if(panel && body && title){
      title.textContent='💼 Payroll';
      body.innerHTML=
        '<div class="box" style="margin:0">'+
          '<h2 style="margin-top:0">💼 Payroll</h2>'+
          '<div class="small" style="margin-bottom:14px">Pusat pengelolaan gaji Hello Majesty.</div>'+
          '<div class="stats">'+
            '<div class="stat"><div class="small">Karyawan</div><div class="num">—</div></div>'+
            '<div class="stat"><div class="small">Payroll Bulan Ini</div><div class="num">—</div></div>'+
            '<div class="stat"><div class="small">Menunggu Approval</div><div class="num">—</div></div>'+
          '</div>'+
          '<div class="role-home-section">MENU PAYROLL</div>'+
          '<div class="role-home-grid">'+
            '<button type="button" class="role-home-card" onclick="hmPayrollComingSoon(\'Data Karyawan\')"><b>👥 Data Karyawan</b><span>Master karyawan & data gaji</span></button>'+
            '<button type="button" class="role-home-card" onclick="hmPayrollComingSoon(\'Komponen Gaji\')"><b>🧾 Komponen Gaji</b><span>Gaji pokok, tunjangan & potongan</span></button>'+
            '<button type="button" class="role-home-card" onclick="hmPayrollComingSoon(\'Perhitungan Payroll\')"><b>🧮 Perhitungan Payroll</b><span>Gaji, komisi, bonus & lembur</span></button>'+
            '<button type="button" class="role-home-card" onclick="hmPayrollComingSoon(\'Approval Payroll\')"><b>✅ Approval Payroll</b><span>Verifikasi sebelum pembayaran</span></button>'+
            '<button type="button" class="role-home-card" onclick="hmPayrollComingSoon(\'Slip Gaji\')"><b>📄 Slip Gaji</b><span>Slip gaji per karyawan</span></button>'+
            '<button type="button" class="role-home-card" onclick="hmPayrollComingSoon(\'Riwayat Payroll\')"><b>📚 Riwayat Payroll</b><span>Histori payroll per periode</span></button>'+
          '</div>'+
        '</div>';
      panel.classList.remove('hidden');
      panel.style.zIndex='1200';
      return;
    }

    if(modal && mb){
      const t=document.getElementById('mt');
      if(t)t.textContent='💼 Payroll';
      mb.innerHTML='<div class="box"><h2>💼 Payroll</h2><p class="small">Modul Payroll Hello Majesty sedang disiapkan.</p></div>';
      modal.classList.remove('hidden');
      return;
    }

    alert('Panel Payroll belum siap. Silakan refresh aplikasi.');
  };

  window.hmPayrollComingSoon = function(name){
    alert(name+' akan kita bangun di modul Payroll. Untuk sekarang menu sudah aktif sebagai fondasi.');
  };
})();