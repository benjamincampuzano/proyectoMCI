const prisma = require('../utils/database');
const { logActivity } = require('../utils/auditLogger');

const VALID_MEDIA_TYPES = ['IMAGE', 'VIDEO'];

const getLoginSetting = async (req, res) => {
    try {
        const setting = await prisma.loginSetting.findFirst({
            orderBy: { id: 'asc' }
        });

        return res.json({
            mediaType: setting?.mediaType || 'IMAGE',
            mediaUrl: setting?.mediaUrl || null,
            welcomeTitle: setting?.welcomeTitle ?? 'Bienvenido a Somos MCI Manizales',
            welcomeSubtitle: setting?.welcomeSubtitle ?? 'Ingresa a tu cuenta para continuar',
            updatedAt: setting?.updatedAt ?? null
        });
    } catch (error) {
        console.error('Error obteniendo configuración de login:', error);
        return res.status(500).json({ message: 'Error al obtener la configuración de login' });
    }
};

const updateLoginSetting = async (req, res) => {
    try {
        const { mediaType, mediaUrl, welcomeTitle, welcomeSubtitle } = req.body;

        const normalizedType = (mediaType || 'IMAGE').toUpperCase();
        if (!VALID_MEDIA_TYPES.includes(normalizedType)) {
            return res.status(400).json({ message: 'Tipo de medio no válido. Solo se permiten IMAGE o VIDEO.' });
        }

        const existing = await prisma.loginSetting.findFirst({ orderBy: { id: 'asc' } });

        const data = {
            mediaType: normalizedType,
            mediaUrl: (mediaUrl || '').trim(),
            welcomeTitle: (welcomeTitle || '').trim() || null,
            welcomeSubtitle: (welcomeSubtitle || '').trim() || null,
            updatedBy: req.user?.id ?? null,
        };

        const setting = existing
            ? await prisma.loginSetting.update({ where: { id: existing.id }, data })
            : await prisma.loginSetting.create({ data });

        try {
            await logActivity(
                req.user?.id,
                'UPDATE',
                'LOGIN_SETTING',
                setting.id,
                { mediaType: normalizedType, mediaUrl: data.mediaUrl }
            );
        } catch (logErr) {
            console.error('Error registrando auditoría de login setting:', logErr);
        }

        return res.json({
            mediaType: setting.mediaType,
            mediaUrl: setting.mediaUrl,
            welcomeTitle: setting.welcomeTitle,
            welcomeSubtitle: setting.welcomeSubtitle,
            updatedAt: setting.updatedAt
        });
    } catch (error) {
        console.error('Error actualizando configuración de login:', error);
        return res.status(500).json({ message: 'Error al actualizar la configuración de login' });
    }
};

const uploadLoginMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió ningún archivo.' });
        }

        const mediaType = (req.file.mimetype.startsWith('video/')) ? 'VIDEO' : 'IMAGE';

        return res.json({
            mediaType,
            mediaUrl: `/media/${req.file.filename}`,
            originalName: req.file.originalname
        });
    } catch (error) {
        console.error('Error subiendo medio de login:', error);
        return res.status(500).json({ message: 'Error al subir el archivo de bienvenida' });
    }
};

module.exports = { getLoginSetting, updateLoginSetting, uploadLoginMedia };