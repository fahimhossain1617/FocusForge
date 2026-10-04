async function check() {
  const res = await fetch('http://localhost:3000/?splash=1');
  console.log('HTTP Status:', res.status);
  const text = await res.text();
  console.log('Includes ff-boot-layer:', text.includes('id="ff-boot-layer"'));
  console.log('Includes ff-boot-badge:', text.includes('id="ff-boot-badge"'));
  console.log('Includes ff-mark:', text.includes('id="ff-mark"'));
  console.log('Includes ff-launch class:', text.includes('ff-launch'));
}
check().catch(console.error);
