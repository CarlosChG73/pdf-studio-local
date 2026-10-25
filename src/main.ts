import './styles.css';

const input = document.querySelector<HTMLInputElement>('#pdf-file');
const status = document.querySelector<HTMLParagraphElement>('#pdf-status');

if (!input || !status) {
  throw new Error('Faltan elementos de la interfaz.');
}

status.textContent = 'Ningún documento seleccionado.';

input.addEventListener('change', () => {
  const file = input.files?.[0];
  status.textContent = file ? file.name : 'Ningún documento seleccionado.';
});
