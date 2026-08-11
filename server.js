const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

const server = http.createServer((req, res) => {
    // Cabeçalhos CORS para permitir chamadas de qualquer origem local (CORS local completo)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Tratar rota da API de exportação
    if (req.method === 'POST' && req.url === '/api/export-siea') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });
        
        req.on('end', () => {
            try {
                const tempJsonPath = path.join(__dirname, `temp_aulas_${Date.now()}.json`);
                const outputPath = path.join(__dirname, 'DADOS', 'MODELO_DE_ENVIO_FORMS_SIEA', `SIEA_preenchido_${Date.now()}.docx`);
                const templatePath = path.join(__dirname, 'DADOS', 'MODELO_DE_ENVIO_FORMS_SIEA', 'SIEA.docx');

                // Salva JSON temporário
                fs.writeFileSync(tempJsonPath, body, 'utf8');

                // Executa script Python
                const cmd = `python "${path.join(__dirname, 'preencher_siea.py')}" "${tempJsonPath}" "${templatePath}" "${outputPath}"`;
                exec(cmd, (error, stdout, stderr) => {
                    if (error || stdout.trim() !== 'Sucesso') {
                        console.error('Erro no Python:', stderr || stdout || error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Erro ao preencher o modelo DOCX.' }));
                        cleanupFiles([tempJsonPath, outputPath]);
                        return;
                    }

                    // Envia arquivo de volta
                    if (fs.existsSync(outputPath)) {
                        const fileBuffer = fs.readFileSync(outputPath);
                        res.writeHead(200, {
                            'Content-Type': MIME_TYPES['.docx'],
                            'Content-Disposition': `attachment; filename=SIEA_preenchido.docx`,
                            'Content-Length': fileBuffer.length
                        });
                        res.end(fileBuffer);
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Arquivo gerado não encontrado.' }));
                    }

                    // Limpa temporários
                    cleanupFiles([tempJsonPath, outputPath]);
                });
            } catch (err) {
                console.error('Erro na API:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Servir arquivos estáticos
    let reqUrl = req.url === '/' ? '/index.html' : req.url;
    reqUrl = reqUrl.split('?')[0]; // Remove query strings
    
    const filePath = path.join(PUBLIC_DIR, reqUrl);
    
    // Proteção básica contra navegação de diretórios
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Acesso proibido');
        return;
    }

    fs.exists(filePath, (exists) => {
        if (!exists) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Arquivo não encontrado');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

function cleanupFiles(paths) {
    paths.forEach(p => {
        try {
            if (fs.existsSync(p)) {
                fs.unlinkSync(p);
            }
        } catch (e) {
            console.error('Erro ao deletar arquivo:', p, e);
        }
    });
}

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
