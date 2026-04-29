// =============================================
// File Upload / Compression
// =============================================

window.photoBase64 = '';
window.photoName = '';
window.photoMimeType = '';

function handleFileUpload(input, prefixoLoja) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        if (typeof showToast === 'function') showToast('⚠️ A imagem deve ter no máximo 5MB', 'error');
        input.value = '';
        return;
    }

    // Prefixo de organização de pastas do Drive, ex: "F3_2023-11-04_"
    const dataAtual = new Date().toISOString().split('T')[0];
    const lojaName = prefixoLoja || 'Loja';
    
    // Armazena globalmente com o prefixo sugerido pelo usuário
    window.photoName = `${lojaName}_${dataAtual}_${file.name}`;
    window.photoMimeType = file.type || 'image/jpeg';

    // Preview local imediato antes de comprimir
    const urlReader = new FileReader();
    urlReader.onload = function (e) {
        const previewImg = document.getElementById('previewImg');
        const fileName = document.getElementById('fileName');
        const filePreview = document.getElementById('filePreview');
        const fileUploadArea = document.getElementById('fileUploadArea');
        
        if (previewImg) previewImg.src = e.target.result;
        if (fileName) fileName.textContent = window.photoName; // mostra com o prefixo
        if (filePreview) filePreview.style.display = 'block';
        if (fileUploadArea) fileUploadArea.classList.add('has-file');
    };
    urlReader.readAsDataURL(file);

    // Compressão da Imagem
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Pega base64 comprimido
            let dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            // Remove prefixo (data:image/jpeg;base64,) para o Google Apps Script decodificar melhor
            window.photoBase64 = dataUrl.split(',')[1];
        }
    }
}

function resetPhotoGlobals() {
    window.photoBase64 = '';
    window.photoName = '';
    window.photoMimeType = '';
    const filePreview = document.getElementById('filePreview');
    if (filePreview) filePreview.style.display = 'none';
    const fileUploadArea = document.getElementById('fileUploadArea');
    if (fileUploadArea) fileUploadArea.classList.remove('has-file');
    
    const input = document.getElementById('foto_relatorio');
    if (input) input.value = '';
}
