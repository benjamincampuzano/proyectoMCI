const { PrismaClient } = require('@prisma/client');
const prisma = require('../prisma/client');
const { logActivity } = require('../utils/auditLogger');

// Obtener todas las noticias (Para Admin/Pastor/etc)
const getAllNews = async (req, res) => {
    try {
        const news = await prisma.news.findMany({
            include: {
                author: {
                    select: {
                        profile: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedNews = news.map(item => ({
            ...item,
            authorName: item.author?.profile?.fullName || 'Desconocido'
        }));

        res.status(200).json(formattedNews);
    } catch (error) {
        console.error('Error fetching all news:', error);
        res.status(500).json({ message: 'Error del servidor al obtener noticias' });
    }
};

// Obtener noticias activas (Para el Pop-up de los usuarios)
const getActiveNews = async (req, res) => {
    try {
        const news = await prisma.news.findMany({
            where: { isActive: true },
            include: {
                author: {
                    select: {
                        profile: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedNews = news.map(item => ({
            ...item,
            authorName: item.author?.profile?.fullName || 'Desconocido'
        }));

        res.status(200).json(formattedNews);
    } catch (error) {
        console.error('Error fetching active news:', error);
        res.status(500).json({ message: 'Error del servidor al obtener noticias activas' });
    }
};

// Crear noticia (Admin/Pastor)
const createNews = async (req, res) => {
    try {
        const authorId = req.user.id;
        const { title, content, imageUrl, isActive } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: 'El título y contenido son requeridos' });
        }

        const news = await prisma.news.create({
            data: {
                title,
                content,
                imageUrl,
                isActive: isActive !== undefined ? isActive : true,
                authorId
            }
        });

        await logActivity(req.user.id, 'CREATE', 'NEWS', news.id, { title: news.title }, req.ip, req.headers['user-agent']);

        res.status(201).json(news);
    } catch (error) {
        console.error('Error creating news:', error);
        res.status(500).json({ message: 'Error del servidor al crear noticia' });
    }
};

// Actualizar noticia (Admin/Pastor)
const updateNews = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, imageUrl, isActive } = req.body;

        const news = await prisma.news.update({
            where: { id: parseInt(id) },
            data: {
                ...(title && { title }),
                ...(content && { content }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(isActive !== undefined && { isActive }),
            }
        });

        await logActivity(req.user.id, 'UPDATE', 'NEWS', news.id, { title: news.title }, req.ip, req.headers['user-agent']);

        res.status(200).json(news);
    } catch (error) {
        console.error('Error updating news:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar noticia' });
    }
};

// Eliminar noticia (Admin/Pastor)
const deleteNews = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.news.delete({
            where: { id: parseInt(id) }
        });

        await logActivity(req.user.id, 'DELETE', 'NEWS', parseInt(id), { newsId: id }, req.ip, req.headers['user-agent']);

        res.status(200).json({ message: 'Noticia eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting news:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar noticia' });
    }
};

module.exports = {
    getAllNews,
    getActiveNews,
    createNews,
    updateNews,
    deleteNews
};
