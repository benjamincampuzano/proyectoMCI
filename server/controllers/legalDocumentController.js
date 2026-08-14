const path = require('path');
const fs = require('fs');
const prisma = require('../utils/database');
const { logActivity } = require('../utils/auditLogger');

const uploadDir = () => path.join(process.cwd(), 'uploads', 'legal-documents');

const isExternalUrl = (value) => /^https?:\/\//i.test(value || '');

const toDownloadUrl = (doc) => {
    const isExternal = isExternalUrl(doc.url);
    return {
        ...doc,
        isExternal,
        url: isExternal ? doc.url : `/api/legal-documents/${doc.id}/download`
    };
};

const getAllDocuments = async (req, res) => {
    try {
        const documents = await prisma.legalDocument.findMany({
            where: { active: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(documents.map(toDownloadUrl));
    } catch (error) {
        console.error('Error fetching legal documents:', error);
        res.status(500).json({ error: 'Error al obtener documentos legales' });
    }
};

const createDocument = async (req, res) => {
    try {
        const { name, url } = req.body;
        const currentUserId = req.user.id;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'El nombre del documento es obligatorio' });
        }

        const externalUrl = url && typeof url === 'string' ? url.trim() : '';
        const hasExternalUrl = !!externalUrl;
        const hasUploadedFile = !!req.file;

        if (!hasExternalUrl && !hasUploadedFile) {
            return res.status(400).json({ error: 'Debes adjuntar un archivo o proporcionar un enlace' });
        }

        if (hasExternalUrl && hasUploadedFile) {
            return res.status(400).json({ error: 'Elige solo una opción: archivo o enlace' });
        }

        let storedUrl;
        if (hasExternalUrl) {
            if (!isExternalUrl(externalUrl)) {
                return res.status(400).json({ error: 'La URL debe ser válida (https://...)' });
            }
            storedUrl = externalUrl;
        } else {
            storedUrl = path.join('uploads', 'legal-documents', req.file.filename);
        }

        const document = await prisma.legalDocument.create({
            data: { name: name.trim(), url: storedUrl }
        });

        await logActivity(currentUserId, 'CREATE', 'DOCUMENT', document.id, { name: document.name, file: req.file?.originalname || storedUrl }, req.ip, req.headers['user-agent']);

        res.status(201).json(toDownloadUrl(document));
    } catch (error) {
        // Limpiar el archivo subido si falla la creación en BD
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, () => {});
        }
        console.error('Error creating legal document:', error);
        res.status(500).json({ error: 'Error al crear documento legal' });
    }
};

const downloadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await prisma.legalDocument.findUnique({
            where: { id: parseInt(id) }
        });

        if (!document || !document.active) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        // Enlace externo (Google Drive) → redirigir
        if (isExternalUrl(document.url)) {
            return res.redirect(302, document.url);
        }

        const filePath = path.join(process.cwd(), document.url);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'El archivo del documento no existe' });
        }

        const fileName = `${document.name}${path.extname(document.url)}`;
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error downloading legal document:', error);
        res.status(500).json({ error: 'Error al descargar documento legal' });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user.id;

        const existing = await prisma.legalDocument.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        const document = await prisma.legalDocument.update({
            where: { id: parseInt(id) },
            data: { active: false }
        });

        // Eliminar el archivo del disco si es un archivo local
        if (!isExternalUrl(existing.url)) {
            const filePath = path.join(process.cwd(), existing.url);
            if (existing.url && fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error('Error al eliminar el archivo del documento:', err.message);
                    }
                });
            }
        }

        await logActivity(currentUserId, 'DELETE', 'DOCUMENT', document.id, { name: document.name }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Documento eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting legal document:', error);
        res.status(500).json({ error: 'Error al eliminar documento legal' });
    }
};

module.exports = {
    getAllDocuments,
    createDocument,
    downloadDocument,
    deleteDocument
};
