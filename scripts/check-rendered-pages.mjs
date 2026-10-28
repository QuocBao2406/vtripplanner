async function checkPages() {
  const diaDiemRes = await fetch('http://localhost:3000/dia-diem');
  const diaDiemHtml = await diaDiemRes.text();
  console.log('dia-diem HTML length:', diaDiemHtml.length);
  console.log('Includes Ho Guom:', diaDiemHtml.includes('Hồ Hoàn Kiếm'));
  console.log('Includes Ba Na Hills:', diaDiemHtml.includes('Bà Nà Hills'));
  console.log('Includes Hoi An:', diaDiemHtml.includes('Hội An'));

  const uuDaiRes = await fetch('http://localhost:3000/uu-dai');
  const uuDaiHtml = await uuDaiRes.text();
  console.log('uu-dai HTML length:', uuDaiHtml.length);
  console.log('Includes 30% voucher:', uuDaiHtml.includes('30%'));
  console.log('Includes Ba Na voucher:', uuDaiHtml.includes('Bà Nà Hills'));
  console.log('Includes Partner:', uuDaiHtml.includes('VTrip'));
}

checkPages().catch(console.error);
