const { PrismaClient } = require('@prisma/client');
const prisma = require('../prisma/client');
const { logActivity } = require('../utils/auditLogger');

const getAllDocuments = async (req, res) => {
    try {
        const documents = await prisma.legalDocument.findMany({
            where: { active: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(documents);
    } catch (error) {
        console.error('Error fetching legal documents:', error);
        res.status(500).json({ error: 'Error al obtener documentos legales' });
    }
};

const createDocument = async (req, res) => {
    try {
        const { name, url } = req.body;
        const currentUserId = req.user.id;

        if (!name || !url) {
            return res.status(400).json({ error: 'Nombre y URL son obligatorios' });
        }

        const document = await prisma.legalDocument.create({
            data: { name, url }
        });

        await logActivity(currentUserId, 'CREATE', 'DOCUMENT', document.id, { name: document.name }, req.ip, req.headers['user-agent']);

        res.status(201).json(document);
    } catch (error) {
        console.error('Error creating legal document:', error);
        res.status(500).json({ error: 'Error al crear documento legal' });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user.id;

        const document = await prisma.legalDocument.update({
            where: { id: parseInt(id) },
            data: { active: false }
        });

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
    deleteDocument
};
