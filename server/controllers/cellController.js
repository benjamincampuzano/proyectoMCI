const { PrismaClient } = require('@prisma/client');
const prisma = require('../utils/database');
const axios = require('axios');
const { logActivity } = require('../utils/auditLogger');
const { getUserNetwork } = require('../utils/networkUtils');

// Helper for Geocoding (Nominatim OpenStreetMap with improved Colombian address handling)
const getCoordinates = async (address, city) => {
    try {
        // Try multiple query formats for better results with Colombian addresses
        const queries = [
            `${address}, ${city}, Caldas, Colombia`,
            `${address}, ${city}, Colombia`,
            `${city}, ${address}, Colombia`,
            `${address}, ${city}`
        ];

        for (const query of queries) {
            try {
                const encodedQuery = encodeURIComponent(query);
                const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5&countrycodes=co&addressdetails=1`;

                // User-Agent is required by Nominatim
                const response = await axios.get(url, {
                    headers: { 'User-Agent': 'IglesiaApp/1.0 (admin@iglesia.com)' },
                    timeout: 5000 // 5 second timeout
                });

                if (response.data && response.data.length > 0) {
                    // Filter results to prioritize those with better accuracy
                    let bestResult = response.data[0];

                    // Look for results that have city/state information
                    for (const result of response.data) {
                        if (result.address && (result.address.city || result.address.town || result.address.state)) {
                            bestResult = result;
                            break;
                        }
                    }

                    // Validate coordinates are reasonable for Colombia
                    const lat = parseFloat(bestResult.lat);
                    const lon = parseFloat(bestResult.lon);

                    // Colombian coordinates roughly: lat 4.2°N to 13.5°N, lon 66.8°W to 81.7°W
                    if (lat >= -4.5 && lat <= 14 && lon >= -82 && lon <= -66) {
                        return { lat, lon };
                    }
                }
            } catch (error) {
                // Continue to next query format if this one fails
                console.warn(`Geocoding attempt failed for query: ${query}`, error.message);
                continue;
            }
        }

        console.warn(`Geocoding failed for all queries with address: ${address}, city: ${city}`);
        return { lat: null, lon: null };
    } catch (error) {
        console.error('Geocoding error:', error.message);
        return { lat: null, lon: null };
    }
};

// Local getNetworkIds removed in favor of centralized getUserNetwork (networkUtils)

// Create a new cell
const createCell = async (req, res) => {
    try {
        const { name, leaderId, hostId, address, city, dayOfWeek, time, liderDoceId, cellType, latitude, longitude } = req.body;
        const requestedLeaderId = parseInt(leaderId);
        const requestedHostId = hostId ? parseInt(hostId) : null;
        const requestedLiderDoceId = liderDoceId ? parseInt(liderDoceId) : null;

        if (!name || !leaderId || !address || !city || !dayOfWeek || !time) {
            return res.status(400).json({ error: 'Missing defined fields' });
        }

        const { roles, id } = req.user;
        const isAuthorized = roles.some(r => ['ADMIN', 'LIDER_DOCE', 'PASTOR'].includes(r));
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Not authorized to create cells' });
        }

        if (!roles.includes('ADMIN')) {
            const networkIds = await getUserNetwork(id);
            if (!networkIds.includes(requestedLeaderId) && requestedLeaderId !== parseInt(id)) {
                return res.status(400).json({ error: 'Leader not in your network' });
            }
        }

        // New Cell Type Leadership Rules
        const targetLeader = await prisma.user.findUnique({
            where: { id: requestedLeaderId },
            include: { roles: { include: { role: true } } }
        });
        const leaderRoles = targetLeader.roles.map(r => r.role.name);

        if (cellType === 'CERRADA' && !leaderRoles.includes('LIDER_DOCE')) {
            return res.status(400).json({ error: 'Una célula CERRADA debe ser dirigida por un Líder de 12' });
        }
        if (cellType === 'ABIERTA' && !leaderRoles.some(r => ['LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'].includes(r))) {
            return res.status(400).json({ error: 'Rol de líder no apto para célula ABIERTA' });
        }

        // Use provided coordinates if available, otherwise geocode
        let finalLat = latitude ? parseFloat(latitude) : null;
        let finalLon = longitude ? parseFloat(longitude) : null;

        // Only geocode if coordinates are not provided
        if (finalLat === null || finalLon === null) {
            const coords = await getCoordinates(address, city);
            finalLat = coords.lat;
            finalLon = coords.lon;
        }

        const newCell = await prisma.cell.create({
            data: {
                name,
                leaderId: requestedLeaderId,
                hostId: requestedHostId,
                liderDoceId: requestedLiderDoceId,
                address,
                city,
                latitude: finalLat,
                longitude: finalLon,
                dayOfWeek,
                time,
                cellType: cellType || 'ABIERTA'
            }
        });

        await logActivity(id, 'CREATE', 'CELL', newCell.id, { name: newCell.name }, req.ip, req.headers['user-agent']);

        res.json(newCell);

    } catch (error) {
        console.error('Error creating cell:', error);
        res.status(500).json({ error: 'Error creating cell' });
    }
};

// Assign functionality (Add member to cell)
const assignMember = async (req, res) => {
    try {
        let { cellId, userId, memberId } = req.body;

        // Start Fix: Handle params and alternative body fields
        if (req.params.id) {
            cellId = req.params.id;
        }

        const targetUserId = userId || memberId;

        if (!cellId || !targetUserId) {
            return res.status(400).json({ error: 'Missing cellId or memberId' });
        }
        // End Fix

        await prisma.user.update({
            where: { id: parseInt(targetUserId) },
            data: { cellId: parseInt(cellId) }
        });

        const { id: currentUserId } = req.user;
        await logActivity(currentUserId, 'UPDATE', 'USER', parseInt(userId), { action: 'ASSIGN_CELL', cellId: parseInt(cellId) }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Member assigned successfully' });
    } catch (error) {
        console.error('Error assigning member:', error);
        res.status(500).json({ error: 'Error assigning member' });
    }
};

// Get Eligible Leaders (LIDER_CELULA in network, optionally filtered by LIDER_DOCE)
const getEligibleLeaders = async (req, res) => {
    try {
        const { roles, id } = req.user;
        const userId = parseInt(id);
        const { liderDoceId } = req.query;
        let where = {};

        let baseIds = [];

        // If liderDoceId is provided, get leaders from that LIDER_DOCE's network
        if (liderDoceId) {
            const liderDoceNetwork = await getUserNetwork(parseInt(liderDoceId));
            baseIds = [parseInt(liderDoceId), ...liderDoceNetwork];

            // For non-admin users, intersect with their network for security
            if (!roles.includes('ADMIN')) {
                const userNetwork = await getUserNetwork(userId);
                baseIds = baseIds.filter(id => userNetwork.includes(id) || id === userId);
            }
        } else {
            // No liderDoceId provided - use original logic
            if (roles.includes('ADMIN')) {
                // ADMIN sees all leaders
                baseIds = null; // No ID filtering for ADMIN
            } else {
                // Non-admin users see leaders in their network
                const networkIds = await getUserNetwork(userId);
                baseIds = [...networkIds, userId];
            }
        }

        where = {
            roles: {
                some: {
                    role: {
                        name: { in: ['LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'] }
                    }
                },
                none: {
                    role: { name: 'ADMIN' }
                }
            }
        };

        // Apply ID filtering if baseIds is set
        if (baseIds && baseIds.length > 0) {
            where.id = { in: baseIds };
        }

        const leaders = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } }
            }
        });

        const formatted = leaders.map(l => ({
            id: l.id,
            fullName: l.profile.fullName,
            roles: l.roles.map(r => r.role.name)
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Eligible Hosts (LIDER_DOCE, LIDER_CELULA, or DISCIPULO from the LIDER_DOCE's network)
const getEligibleHosts = async (req, res) => {
    try {
        const { liderDoceId } = req.query;
        const { id: currentUserId, roles } = req.user;
        
        // If no liderDoceId, return empty
        if (!liderDoceId) return res.json([]);

        // Get the LIDER_DOCE's network (includes all LIDER_CELULA and DISCIPULO)
        const liderDoceNetwork = await getUserNetwork(parseInt(liderDoceId));
        
        // Start with the LIDER_DOCE themselves
        let ids = [parseInt(liderDoceId)];
        
        // Add all users from LIDER_DOCE's network
        if (liderDoceNetwork && liderDoceNetwork.length > 0) {
            ids = [...ids, ...liderDoceNetwork];
        }

        // For non-admin users, filter by their network
        if (!roles.includes('ADMIN')) {
            const currentUserNetwork = await getUserNetwork(parseInt(currentUserId));
            const allValidIds = [...currentUserNetwork, parseInt(currentUserId)];
            ids = ids.filter(id => allValidIds.includes(id));
        }

        // If no valid IDs, at least return the LIDER_DOCE themselves
        if (ids.length === 0) {
            ids = [parseInt(liderDoceId)];
        }

        // Filter by roles: LIDER_DOCE, LIDER_CELULA, or DISCIPULO
        const where = {
            id: { in: ids },
            OR: [
                { roles: { some: { role: { name: 'LIDER_DOCE' } } } },
                { roles: { some: { role: { name: 'LIDER_CELULA' } } } },
                { roles: { some: { role: { name: 'DISCIPULO' } } } }
            ],
            roles: {
                none: {
                    role: { name: 'ADMIN' }
                }
            }
        };

        const hosts = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } }
            }
        });

        const formatted = hosts.map(h => ({
            id: h.id,
            fullName: h.profile.fullName,
            role: h.roles.map(r => r.role.name).find(r => r !== 'ADMIN') || 'Usuario'
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error in getEligibleHosts:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Eligible Members (Network of a specific leader or current user)
const getEligibleMembers = async (req, res) => {
    try {
        const { roles, id } = req.user;
        const { leaderId, cellType } = req.query;

        // Perform action as current user (supervisor or admin)
        const currentUserId = parseInt(id);

        // Fetch current user roles
        const user = await prisma.user.findUnique({
            where: { id: currentUserId },
            include: { roles: { include: { role: true } } }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const userRoles = user.roles.map(r => r.role.name);

        let where = {};

        // Security Filter: ADMIN sees everyone, Supervisor sees their network
        if (roles.includes('ADMIN')) {
            where = {
                roles: {
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            };
        } else {
            const networkIds = await getUserNetwork(currentUserId);
            where = {
                id: { in: [...networkIds, currentUserId] },
                roles: {
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            };
        }

        // --- Role Filtering based on Cell Type ---
        if (cellType === 'CERRADA') {
            // Cerrada: LIDER_CELULA or DISCIPULO (for those in training to be leaders)
            where.roles = {
                some: {
                    role: { name: { in: ['LIDER_CELULA', 'DISCIPULO'] } }
                }
            };
        } else if (cellType === 'ABIERTA' || !cellType) {
            // Abierta: DISCIPULO
            where.roles = {
                some: {
                    role: { name: { in: ['DISCIPULO'] } }
                }
            };
        }

        // Special restriction for PASTOR (can lead cells of LIDER_DOCE)
        if (userRoles.includes('PASTOR')) {
            // Pastors usually manage cells of LIDER_DOCE
            // But we already filtered by network above. 
            // If they are specifically looking for their leaders:
            where.roles = {
                some: {
                    role: { name: { in: ['LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'] } }
                }
            };
        }

        const members = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } },
                cell: { select: { name: true } }
            }
        });

        const formatted = members.map(m => ({
            id: m.id,
            fullName: m.profile.fullName,
            roles: m.roles.map(r => r.role.name),
            cellId: m.cellId,
            cellName: m.cell?.name
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error in getEligibleMembers:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete a cell
const deleteCell = async (req, res) => {
    try {
        const { id } = req.params; // Cell ID
        const cellId = parseInt(id);
        const { roles, id: userId } = req.user;

        // 1. Permission check
        const isAuthorized = roles.some(r => ['ADMIN', 'LIDER_DOCE'].includes(r));
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Not authorized to delete cells' });
        }

        // Find cell to verify ownership/existence
        const cell = await prisma.cell.findUnique({
            where: { id: cellId },
            select: { leaderId: true, name: true }
        });
        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        // If LIDER_DOCE or PASTOR, verify cell is in their network
        if (!roles.includes('ADMIN')) {
            // Check if cell leader is in their network or is themselves
            const networkIds = await getUserNetwork(userId);
            if (!networkIds.includes(cell.leaderId) && cell.leaderId !== userId) {
                return res.status(403).json({ error: 'Cannot delete a cell outside your network' });
            }
        }

        // 2. Cleanup transaction
        await prisma.$transaction(async (tx) => {
            // A. Unassign members
            await tx.user.updateMany({
                where: { cellId: cellId },
                data: { cellId: null }
            });

            // B. Delete attendances
            await tx.cellAttendance.deleteMany({
                where: { cellId: cellId }
            });

            // C. Delete cell
            await tx.cell.delete({
                where: { id: cellId }
            });
        });

        await logActivity(userId, 'DELETE', 'CELL', cellId, { name: cell.name }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Cell deleted successfully' });

    } catch (error) {
        console.error('Error deleting cell:', error);
        res.status(500).json({ error: 'Error deleting cell' });
    }
};

// Update coordinates for an existing cell
const updateCellCoordinates = async (req, res) => {
    try {
        const { id } = req.params;
        const cellId = parseInt(id);

        const cell = await prisma.cell.findUnique({
            where: { id: cellId },
            select: { address: true, city: true }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Célula no encontrada' });
        }

        const coords = await getCoordinates(cell.address, cell.city);

        if (coords.lat === null) {
            return res.status(400).json({ error: 'No se pudieron obtener coordenadas para esta dirección. Verifique que la dirección y ciudad sean correctas.' });
        }

        const updatedCell = await prisma.cell.update({
            where: { id: cellId },
            data: {
                latitude: coords.lat,
                longitude: coords.lon
            }
        });

        res.json(updatedCell);
    } catch (error) {
        console.error('Error updating coordinates:', error);
        res.status(500).json({ error: 'Error al actualizar coordenadas' });
    }
};

// Update an existing cell
const updateCell = async (req, res) => {
    try {
        const { id } = req.params;
        const cellId = parseInt(id);
        const { name, leaderId, hostId, address, city, dayOfWeek, time, liderDoceId, cellType, latitude, longitude } = req.body;

        const { roles, id: userId } = req.user;

        // Find existing cell
        const existingCell = await prisma.cell.findUnique({
            where: { id: cellId }
        });

        if (!existingCell) {
            return res.status(404).json({ error: 'Célula no encontrada' });
        }

        // Permission check
        if (!roles.includes('ADMIN')) {
            const networkIds = await getUserNetwork(userId);
            if (!networkIds.includes(existingCell.leaderId) && existingCell.leaderId !== userId) {
                return res.status(403).json({ error: 'No autorizado para editar esta célula' });
            }
        }

        const data = {};
        if (name) data.name = name;
        if (leaderId) data.leaderId = parseInt(leaderId);
        if (hostId !== undefined) data.hostId = hostId ? parseInt(hostId) : null;
        if (liderDoceId !== undefined) data.liderDoceId = liderDoceId ? parseInt(liderDoceId) : null;
        if (address) data.address = address;
        if (city) data.city = city;
        if (dayOfWeek) data.dayOfWeek = dayOfWeek;
        if (time) data.time = time;
        if (cellType) data.cellType = cellType;

        // Use provided coordinates if available, otherwise geocode if address/city changed
        if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
            data.latitude = parseFloat(latitude);
            data.longitude = parseFloat(longitude);
        } else if ((address && address !== existingCell.address) || (city && city !== existingCell.city)) {
            const coords = await getCoordinates(address || existingCell.address, city || existingCell.city);
            data.latitude = coords.lat;
            data.longitude = coords.lon;
        }

        const updatedCell = await prisma.cell.update({
            where: { id: cellId },
            data
        });

        await logActivity(userId, 'UPDATE', 'CELL', cellId, { name: updatedCell.name }, req.ip, req.headers['user-agent']);

        res.json(updatedCell);
    } catch (error) {
        console.error('Error updating cell:', error);
        res.status(500).json({ error: 'Error al actualizar la célula' });
    }
};

const unassignMember = async (req, res) => {
    try {
        const { userId } = req.body;
        const { memberId } = req.params;
        const targetUserId = userId || memberId;
        const { id: currentUserId } = req.user;

        await prisma.user.update({
            where: { id: parseInt(targetUserId) },
            data: { cellId: null }
        });

        await logActivity(currentUserId, 'UPDATE', 'USER', parseInt(targetUserId), { action: 'UNASSIGN_CELL' }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Miembro desvinculado correctamente' });
    } catch (error) {
        console.error('Error unassigning member:', error);
        res.status(500).json({ error: 'Error al desvincular miembro' });
    }
};

// Get Eligible Doce Leaders
const getEligibleDoceLeaders = async (req, res) => {
    try {
        const { roles, id } = req.user;
        const userId = parseInt(id);
        let where = {};

        // If user is ADMIN, show all LIDER_DOCE, otherwise filter by network
        if (roles.includes('ADMIN')) {
            where = {
                roles: {
                    some: {
                        role: { name: 'LIDER_DOCE' }
                    }
                }
            };
        } else {
            // Apply network filtering for non-admin users
            const networkIds = await getUserNetwork(userId);
            where = {
                id: { in: [...networkIds, userId] },
                roles: {
                    some: {
                        role: { name: 'LIDER_DOCE' }
                    }
                }
            };
        }

        const leaders = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } }
            }
        });

        const formatted = leaders.map(l => ({
            id: l.id,
            fullName: l.profile.fullName,
            roles: l.roles.map(r => r.role.name)
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createCell,
    deleteCell,
    assignMember,
    getEligibleLeaders,
    getEligibleHosts,
    getEligibleMembers,
    updateCellCoordinates,
    getEligibleDoceLeaders,
    updateCell,
    unassignMember
};
