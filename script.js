// Variáveis globais
let canvas, ctx;
let isDrawing = false;
let hasSignature = false;
let firebaseStorage, firebaseRef, firebaseUploadBytes, firebaseGetDownloadURL;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    initializeFirebase();
    initializeCanvas();
});

// Configuração e inicialização do Firebase
async function initializeFirebase() {
    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getStorage, ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

        // Configuração do Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyD0fEAS-uL8tklmBNzLMrBHZ3Hh5cK21mM",
            authDomain: "orange-fast.firebaseapp.com",
            databaseURL: "https://orange-fast-default-rtdb.firebaseio.com",
            projectId: "orange-fast",
            storageBucket: "orange-fast.appspot.com",
            messagingSenderId: "816303515640",
            appId: "1:816303515640:web:fb1356d7b9e6cd60d3580d",
            measurementId: "G-5M2Z7DSHM0"
        };

        // Inicializar Firebase
        const app = initializeApp(firebaseConfig);
        firebaseStorage = getStorage(app);
        firebaseRef = ref;
        firebaseUploadBytes = uploadBytes;
        firebaseGetDownloadURL = getDownloadURL;

        console.log('Firebase inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        showStatus('Erro ao conectar com o Firebase. Verifique sua conexão.', 'error');
    }
}

// Inicializar canvas
function initializeCanvas() {
    canvas = document.getElementById('signatureCanvas');
    ctx = canvas.getContext('2d');
    
    // Configurar tamanho do canvas
    resizeCanvas();
    
    // Configurar estilo do desenho
    setupCanvasStyle();

    // Event listeners para mouse
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Event listeners para touch
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);

    // Redimensionar canvas quando a janela mudar
    window.addEventListener('resize', resizeCanvas);
}

// Configurar estilo do canvas
function setupCanvasStyle() {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

// Redimensionar canvas
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Reconfigurar estilo após redimensionamento
    setupCanvasStyle();
}

// Obter posição do mouse
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// Obter posição do touch
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
    };
}

// Iniciar desenho
function startDrawing(e) {
    isDrawing = true;
    const pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    hideStatus();
}

// Desenhar
function draw(e) {
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    updateSignatureState();
}

// Manipular eventos touch
function handleTouch(e) {
    e.preventDefault();
    
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                    e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    
    if (e.type === 'touchstart') {
        startDrawing(mouseEvent);
    } else if (e.type === 'touchmove') {
        draw(mouseEvent);
    }
}

// Parar desenho
function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        ctx.beginPath();
        updateSignatureState();
    }
}

// Atualizar estado da assinatura
function updateSignatureState() {
    hasSignature = !isCanvasEmpty();
    document.getElementById('confirmBtn').disabled = !hasSignature;
    document.getElementById('placeholder').style.display = hasSignature ? 'none' : 'block';
}

// Verificar se canvas está vazio
function isCanvasEmpty() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData.data.every(pixel => pixel === 0);
}

// Limpar assinatura
function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    document.getElementById('confirmBtn').disabled = true;
    document.getElementById('placeholder').style.display = 'block';
    hideStatus();
}

// Mostrar loading overlay
function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';
}

// Esconder loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
}

// Confirmar assinatura
async function confirmSignature() {
    if (!hasSignature) {
        showStatus('Por favor, faça sua assinatura primeiro.', 'error');
        return;
    }

    if (!firebaseStorage) {
        showStatus('Firebase não está inicializado. Recarregue a página.', 'error');
        return;
    }

    // Mostrar loading overlay
    showLoadingOverlay();
    
    try {
        // Converter canvas para blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });

        // Gerar nome único para o arquivo
        const timestamp = new Date().getTime();
        const fileName = `assinatura_${timestamp}.png`;

        // Upload para Firebase Storage
        const storageRef = firebaseRef(firebaseStorage, `assinaturas/${fileName}`);
        const snapshot = await firebaseUploadBytes(storageRef, blob);
        
        // Obter URL de download
        const downloadURL = await firebaseGetDownloadURL(snapshot.ref);
        
        // Esconder loading overlay
        hideLoadingOverlay();
        
        // Navegar para o link da imagem
        window.open(downloadURL, '_self');
        
        // Opcional: mostrar mensagem de sucesso brevemente
        showStatus('Assinatura enviada com sucesso! Abrindo imagem...', 'success');
        setTimeout(() => {
            hideStatus();
        }, 3000);
        
    } catch (error) {
        console.error('Erro ao enviar assinatura:', error);
        hideLoadingOverlay();
        showStatus('Erro ao enviar assinatura. Tente novamente.', 'error');
    }
}

// Mostrar status
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
}

// Esconder status
function hideStatus() {
    document.getElementById('status').style.display = 'none';
}

// Disponibilizar funções globalmente para os botões HTML
window.clearSignature = clearSignature;
window.confirmSignature = confirmSignature;

