// const express = require("express");
// const router = express.Router();
// const db = require("../../DB/ConnectionSql");

// // ==================== HELPER FUNCTIONS ====================

// // Calculate distance between two points in km using Haversine formula
// const calculateDistance = (lat1, lon1, lat2, lon2) => {
//     const R = 6371; // Earth's radius in km
//     const dLat = (lat2 - lat1) * Math.PI / 180;
//     const dLon = (lon2 - lon1) * Math.PI / 180;
//     const a =
//         Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//         Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
//         Math.sin(dLon / 2) * Math.sin(dLon / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c;
// };

// // Calculate speed between two points (km/h)
// const calculateSpeed = (lat1, lon1, lat2, lon2, time1, time2) => {
//     const distance = calculateDistance(lat1, lon1, lat2, lon2);
//     const hours = (new Date(time2) - new Date(time1)) / (1000 * 60 * 60);
//     return hours > 0 ? distance / hours : 0;
// };

// // Detect stops from location points
// const detectStops = (points, minPoints = 3, radiusMeters = 50) => {
//     if (!points || points.length < minPoints) return [];

//     const stops = [];
//     let currentStop = [];
//     const radiusKm = radiusMeters / 1000;

//     for (let i = 0; i < points.length; i++) {
//         const point = points[i];

//         if (currentStop.length === 0) {
//             currentStop.push(point);
//             continue;
//         }

//         const lastPointInStop = currentStop[currentStop.length - 1];
//         const distance = calculateDistance(
//             parseFloat(lastPointInStop.latitude),
//             parseFloat(lastPointInStop.longitude),
//             parseFloat(point.latitude),
//             parseFloat(point.longitude)
//         );

//         if (distance <= radiusKm) {
//             currentStop.push(point);
//         } else {
//             if (currentStop.length >= minPoints) {
//                 stops.push([...currentStop]);
//             }
//             currentStop = [point];
//         }
//     }

//     // Check last stop
//     if (currentStop.length >= minPoints) {
//         stops.push(currentStop);
//     }

//     return stops;
// };

// // Calculate stop details
// const calculateStopDetails = (stopPoints) => {
//     if (!stopPoints || stopPoints.length === 0) return null;

//     const firstPoint = stopPoints[0];
//     const lastPoint = stopPoints[stopPoints.length - 1];

//     // Calculate center point (average of coordinates)
//     const centerLat = stopPoints.reduce((sum, p) => sum + parseFloat(p.latitude), 0) / stopPoints.length;
//     const centerLng = stopPoints.reduce((sum, p) => sum + parseFloat(p.longitude), 0) / stopPoints.length;

//     const startTime = new Date(firstPoint.recorded_at || firstPoint.timestamp);
//     const endTime = new Date(lastPoint.recorded_at || lastPoint.timestamp);
//     const durationMs = endTime - startTime;

//     // Format duration
//     const hours = Math.floor(durationMs / (1000 * 60 * 60));
//     const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
//     const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

//     const durationFormatted = hours > 0
//         ? `${hours}h ${minutes}m ${seconds}s`
//         : minutes > 0
//             ? `${minutes}m ${seconds}s`
//             : `${seconds}s`;

//     return {
//         center: [centerLat, centerLng],
//         startTime: firstPoint.recorded_at || firstPoint.timestamp,
//         endTime: lastPoint.recorded_at || lastPoint.timestamp,
//         duration: durationMs,
//         durationFormatted,
//         pointCount: stopPoints.length,
//         points: stopPoints
//     };
// };

// // Generate daily summaries
// const generateDailySummaries = (history) => {
//     const dailyMap = new Map();

//     history.forEach(point => {
//         const date = new Date(point.recorded_at || point.timestamp).toISOString().split('T')[0];

//         if (!dailyMap.has(date)) {
//             dailyMap.set(date, {
//                 date,
//                 points: [],
//                 totalDistance: 0,
//                 firstLocationTime: point.recorded_at || point.timestamp,
//                 lastLocationTime: point.recorded_at || point.timestamp,
//                 maxSpeed: 0,
//                 speedSum: 0,
//                 stops: []
//             });
//         }

//         const day = dailyMap.get(date);
//         day.points.push(point);

//         // Update times
//         const pointTime = new Date(point.recorded_at || point.timestamp);
//         if (pointTime < new Date(day.firstLocationTime)) {
//             day.firstLocationTime = point.recorded_at || point.timestamp;
//         }
//         if (pointTime > new Date(day.lastLocationTime)) {
//             day.lastLocationTime = point.recorded_at || point.timestamp;
//         }

//         // Update speed
//         day.maxSpeed = Math.max(day.maxSpeed, point.speed || 0);
//         day.speedSum += point.speed || 0;
//     });

//     // Calculate distances and stops for each day
//     dailyMap.forEach(day => {
//         // Calculate total distance
//         for (let i = 1; i < day.points.length; i++) {
//             const dist = calculateDistance(
//                 parseFloat(day.points[i - 1].latitude),
//                 parseFloat(day.points[i - 1].longitude),
//                 parseFloat(day.points[i].latitude),
//                 parseFloat(day.points[i].longitude)
//             );
//             day.totalDistance += dist;
//         }

//         // Detect stops
//         const stops = detectStops(day.points, 3, 50);
//         day.stops = stops.map(stop => calculateStopDetails(stop)).filter(s => s !== null);

//         // Calculate active time (time between first and last minus stop durations)
//         const totalDuration = new Date(day.lastLocationTime) - new Date(day.firstLocationTime);
//         const stopDuration = day.stops.reduce((sum, stop) => sum + stop.duration, 0);

//         day.activeTime = Math.max(0, totalDuration - stopDuration);
//         day.activeTimeFormatted = formatDuration(day.activeTime / 1000);
//         day.stopDurationFormatted = formatDuration(stopDuration / 1000);
//         day.stopsCount = day.stops.length;
//         day.avgSpeed = day.points.length > 0 ? day.speedSum / day.points.length : 0;
//         day.pointCount = day.points.length;

//         // Clean up
//         delete day.points;
//         delete day.speedSum;
//     });

//     return Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
// };

// // Format duration from seconds
// const formatDuration = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     const secs = Math.floor(seconds % 60);

//     return hours > 0
//         ? `${hours}h ${minutes}m ${secs}s`
//         : minutes > 0
//             ? `${minutes}m ${secs}s`
//             : `${secs}s`;
// };

// // ==================== API ENDPOINTS ====================

// // Get location history for an employee
// router.post("/GetLocationHistory", async (req, res) => {
//     try {
//         const {
//             employeeId,
//             companyId,
//             startDate,
//             endDate,
//             page = 1,
//             limit = 100,
//             sortOrder = 'DESC'
//         } = req.body;

//         if (!employeeId || !companyId) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Employee ID and Company ID are required"
//             });
//         }

//         // Calculate offset for pagination
//         const offset = (page - 1) * limit;

//         // Build query
//         let query = `
//             SELECT 
//                 id,
//                 employee_id,
//                 company_id,
//                 latitude,
//                 longitude,
//                 speed,
//                 heading,
//                 altitude,
//                 accuracy,
//                 battery_level,
//                 event_type,
//                 recorded_at,
//                 created_at,
//                 type
//             FROM employee_locations 
//             WHERE employee_id = ? 
//             AND company_id = ?
//         `;

//         const params = [employeeId, companyId];

//         // Add date filters if provided
//         if (startDate && endDate) {
//             query += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
//             params.push(startDate, endDate);
//         } else if (startDate) {
//             query += ` AND DATE(recorded_at) >= ?`;
//             params.push(startDate);
//         } else if (endDate) {
//             query += ` AND DATE(recorded_at) <= ?`;
//             params.push(endDate);
//         }

//         // Add sorting and pagination
//         query += ` ORDER BY recorded_at ${sortOrder === 'DESC' ? 'DESC' : 'ASC'} LIMIT ? OFFSET ?`;
//         params.push(limit, offset);

//         // Execute query
//         const [history] = await db.promise().query(query, params);

//         // Get total count for pagination
//         let countQuery = `
//             SELECT COUNT(*) as total 
//             FROM employee_locations 
//             WHERE employee_id = ? AND company_id = ?
//         `;
//         const countParams = [employeeId, companyId];

//         if (startDate && endDate) {
//             countQuery += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
//             countParams.push(startDate, endDate);
//         }

//         const [totalResult] = await db.promise().query(countQuery, countParams);
//         const total = totalResult[0].total;

//         // Process history data
//         const processedHistory = history.map(point => ({
//             ...point,
//             latitude: parseFloat(point.latitude),
//             longitude: parseFloat(point.longitude),
//             speed: parseFloat(point.speed || 0),
//             timestamp: point.recorded_at || point.created_at
//         }));

//         // Generate daily summaries if there's data
//         let dailySummaries = [];
//         let periodTotals = null;

//         if (processedHistory.length > 0) {
//             dailySummaries = generateDailySummaries(processedHistory);

//             // Calculate period totals
//             const totalDistance = dailySummaries.reduce((sum, day) => sum + day.totalDistance, 0);
//             const totalActiveTime = dailySummaries.reduce((sum, day) => sum + day.activeTime, 0);
//             const totalStops = dailySummaries.reduce((sum, day) => sum + day.stopsCount, 0);
//             const activeDays = dailySummaries.length;

//             periodTotals = {
//                 totalDistance: parseFloat(totalDistance.toFixed(2)),
//                 totalActiveTime,
//                 totalActiveTimeFormatted: formatDuration(totalActiveTime / 1000),
//                 totalStops,
//                 avgDailyDistance: activeDays > 0 ? parseFloat((totalDistance / activeDays).toFixed(2)) : 0,
//                 activeDays
//             };
//         }

//         // Calculate stops for the entire period
//         const stops = detectStops(processedHistory, 3, 50);
//         const stopDetails = stops.map(stop => calculateStopDetails(stop)).filter(s => s !== null);

//         return res.status(200).json({
//             status: true,
//             data: {
//                 history: processedHistory,
//                 dailySummaries,
//                 periodTotals,
//                 stops: stopDetails,
//                 pagination: {
//                     currentPage: page,
//                     totalPages: Math.ceil(total / limit),
//                     totalItems: total,
//                     itemsPerPage: limit,
//                     hasNext: offset + limit < total,
//                     hasPrevious: page > 1
//                 }
//             }
//         });

//     } catch (error) {
//         console.error("❌ GetLocationHistory error:", error);
//         return res.status(500).json({
//             status: false,
//             message: "Failed to fetch location history",
//             error: error.message
//         });
//     }
// });

// // Get last known location for all employees in a company
// router.post("/GetLiveLocations", async (req, res) => {
//     try {
//         const { companyId, employeeIds } = req.body;

//         if (!companyId) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Company ID is required"
//             });
//         }

//         let query = `
//             SELECT el.* 
//             FROM employee_locations el
//             INNER JOIN (
//                 SELECT employee_id, MAX(recorded_at) as max_recorded
//                 FROM employee_locations
//                 WHERE company_id = ?
//                 ${employeeIds && employeeIds.length ? `AND employee_id IN (${employeeIds.map(() => '?').join(',')})` : ''}
//                 GROUP BY employee_id
//             ) latest ON el.employee_id = latest.employee_id 
//                 AND el.recorded_at = latest.max_recorded
//             WHERE el.company_id = ?
//             ${employeeIds && employeeIds.length ? `AND el.employee_id IN (${employeeIds.map(() => '?').join(',')})` : ''}
//             ORDER BY el.recorded_at DESC
//         `;

//         const params = [companyId];
//         if (employeeIds && employeeIds.length) {
//             params.push(...employeeIds);
//         }
//         params.push(companyId);
//         if (employeeIds && employeeIds.length) {
//             params.push(...employeeIds);
//         }

//         const [locations] = await db.promise().query(query, params);

//         const processedLocations = locations.map(loc => ({
//             ...loc,
//             latitude: parseFloat(loc.latitude),
//             longitude: parseFloat(loc.longitude),
//             speed: parseFloat(loc.speed || 0),
//             timestamp: loc.recorded_at
//         }));

//         return res.status(200).json({
//             status: true,
//             data: processedLocations
//         });

//     } catch (error) {
//         console.error("❌ GetLiveLocations error:", error);
//         return res.status(500).json({
//             status: false,
//             message: "Failed to fetch live locations",
//             error: error.message
//         });
//     }
// });

// // Get location statistics for an employee
// router.post("/GetLocationStats", async (req, res) => {
//     try {
//         const { employeeId, companyId, startDate, endDate } = req.body;

//         if (!employeeId || !companyId) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Employee ID and Company ID are required"
//             });
//         }

//         // Build query
//         let query = `
//             SELECT 
//                 DATE(recorded_at) as date,
//                 COUNT(*) as point_count,
//                 MIN(recorded_at) as first_time,
//                 MAX(recorded_at) as last_time,
//                 AVG(speed) as avg_speed,
//                 MAX(speed) as max_speed,
//                 MIN(speed) as min_speed
//             FROM employee_locations 
//             WHERE employee_id = ? 
//             AND company_id = ?
//         `;

//         const params = [employeeId, companyId];

//         // Add date filters if provided
//         if (startDate && endDate) {
//             query += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
//             params.push(startDate, endDate);
//         }

//         query += ` GROUP BY DATE(recorded_at) ORDER BY date DESC`;

//         const [stats] = await db.promise().query(query, params);

//         // Calculate overall statistics
//         let overallQuery = `
//             SELECT 
//                 COUNT(*) as total_points,
//                 MIN(recorded_at) as first_record,
//                 MAX(recorded_at) as last_record,
//                 AVG(speed) as overall_avg_speed,
//                 MAX(speed) as overall_max_speed
//             FROM employee_locations 
//             WHERE employee_id = ? 
//             AND company_id = ?
//         `;

//         if (startDate && endDate) {
//             overallQuery += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
//         }

//         const [overallResult] = await db.promise().query(overallQuery, params);
//         const overall = overallResult[0];

//         // Calculate total distance for the period
//         let distanceQuery = `
//             SELECT latitude, longitude, recorded_at
//             FROM employee_locations 
//             WHERE employee_id = ? 
//             AND company_id = ?
//         `;

//         if (startDate && endDate) {
//             distanceQuery += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
//         }

//         distanceQuery += ` ORDER BY recorded_at ASC`;

//         const [points] = await db.promise().query(distanceQuery, params);

//         // Calculate total distance
//         let totalDistance = 0;
//         for (let i = 1; i < points.length; i++) {
//             totalDistance += calculateDistance(
//                 parseFloat(points[i - 1].latitude),
//                 parseFloat(points[i - 1].longitude),
//                 parseFloat(points[i].latitude),
//                 parseFloat(points[i].longitude)
//             );
//         }

//         // Detect stops
//         const processedPoints = points.map(p => ({
//             ...p,
//             latitude: parseFloat(p.latitude),
//             longitude: parseFloat(p.longitude)
//         }));

//         const stops = detectStops(processedPoints, 3, 50);
//         const stopDetails = stops.map(stop => calculateStopDetails(stop)).filter(s => s !== null);

//         return res.status(200).json({
//             status: true,
//             data: {
//                 dailyStats: stats.map(s => ({
//                     ...s,
//                     avg_speed: parseFloat(s.avg_speed || 0).toFixed(2),
//                     max_speed: parseFloat(s.max_speed || 0).toFixed(2),
//                     min_speed: parseFloat(s.min_speed || 0).toFixed(2)
//                 })),
//                 overall: {
//                     totalPoints: overall.total_points,
//                     firstRecord: overall.first_record,
//                     lastRecord: overall.last_record,
//                     avgSpeed: parseFloat(overall.overall_avg_speed || 0).toFixed(2),
//                     maxSpeed: parseFloat(overall.overall_max_speed || 0).toFixed(2),
//                     totalDistance: parseFloat(totalDistance.toFixed(2)),
//                     totalStops: stopDetails.length,
//                     stops: stopDetails
//                 }
//             }
//         });

//     } catch (error) {
//         console.error("❌ GetLocationStats error:", error);
//         return res.status(500).json({
//             status: false,
//             message: "Failed to fetch location statistics",
//             error: error.message
//         });
//     }
// });

// // Get heatmap data for an employee
// router.post("/GetHeatmapData", async (req, res) => {
//     try {
//         const { employeeId, companyId, startDate, endDate, gridSize = 0.001 } = req.body;

//         if (!employeeId || !companyId) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Employee ID and Company ID are required"
//             });
//         }

//         let query = `
//             SELECT 
//                 latitude,
//                 longitude,
//                 speed,
//                 recorded_at
//             FROM employee_locations 
//             WHERE employee_id = ? 
//             AND company_id = ?
//         `;

//         const params = [employeeId, companyId];

//         if (startDate && endDate) {
//             query += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
//             params.push(startDate, endDate);
//         }

//         query += ` ORDER BY recorded_at ASC`;

//         const [points] = await db.promise().query(query, params);

//         // Create grid for heatmap
//         const grid = {};

//         points.forEach(point => {
//             const lat = parseFloat(point.latitude);
//             const lng = parseFloat(point.longitude);
//             const latKey = Math.floor(lat / gridSize) * gridSize;
//             const lngKey = Math.floor(lng / gridSize) * gridSize;
//             const key = `${latKey.toFixed(6)}-${lngKey.toFixed(6)}`;

//             if (!grid[key]) {
//                 grid[key] = {
//                     center: [latKey + gridSize / 2, lngKey + gridSize / 2],
//                     count: 0,
//                     points: [],
//                     speeds: [],
//                     firstSeen: point.recorded_at,
//                     lastSeen: point.recorded_at
//                 };
//             }

//             grid[key].count++;
//             grid[key].points.push(point);
//             grid[key].speeds.push(point.speed || 0);

//             if (new Date(point.recorded_at) < new Date(grid[key].firstSeen)) {
//                 grid[key].firstSeen = point.recorded_at;
//             }
//             if (new Date(point.recorded_at) > new Date(grid[key].lastSeen)) {
//                 grid[key].lastSeen = point.recorded_at;
//             }
//         });

//         // Calculate intensity and average speed
//         const maxCount = Math.max(...Object.values(grid).map(g => g.count));

//         const heatmapData = Object.entries(grid).map(([key, data]) => ({
//             key,
//             center: data.center,
//             count: data.count,
//             intensity: data.count / maxCount,
//             avgSpeed: data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length,
//             firstSeen: data.firstSeen,
//             lastSeen: data.lastSeen
//         }));

//         return res.status(200).json({
//             status: true,
//             data: heatmapData
//         });

//     } catch (error) {
//         console.error("❌ GetHeatmapData error:", error);
//         return res.status(500).json({
//             status: false,
//             message: "Failed to fetch heatmap data",
//             error: error.message
//         });
//     }
// });

// // Export location history to CSV
// router.post("/ExportLocationHistory", async (req, res) => {
//     try {
//         const { employeeId, companyId, startDate, endDate } = req.body;

//         if (!employeeId || !companyId) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Employee ID and Company ID are required"
//             });
//         }

//         let query = `
//             SELECT 
//                 employee_id,
//                 DATE(recorded_at) as date,
//                 TIME(recorded_at) as time,
//                 latitude,
//                 longitude,
//                 speed,
//                 heading,
//                 altitude,
//                 accuracy,
//                 battery_level,
//                 event_type,
//                 type
//             FROM employee_locations 
//             WHERE employee_id = ? 
//             AND company_id = ?
//         `;

//         const params = [employeeId, companyId];

//         if (startDate && endDate) {
//             query += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
//             params.push(startDate, endDate);
//         }

//         query += ` ORDER BY recorded_at ASC`;

//         const [locations] = await db.promise().query(query, params);

//         // Generate CSV
//         const csvRows = [];

//         // Headers
//         csvRows.push([
//             'Date',
//             'Time',
//             'Latitude',
//             'Longitude',
//             'Speed (km/h)',
//             'Heading',
//             'Altitude',
//             'Accuracy',
//             'Battery Level',
//             'Event Type',
//             'Type'
//         ].join(','));

//         // Data rows
//         locations.forEach(loc => {
//             csvRows.push([
//                 loc.date,
//                 loc.time,
//                 parseFloat(loc.latitude).toFixed(6),
//                 parseFloat(loc.longitude).toFixed(6),
//                 parseFloat(loc.speed || 0).toFixed(2),
//                 loc.heading || '',
//                 loc.altitude || '',
//                 loc.accuracy || '',
//                 loc.battery_level || '',
//                 loc.event_type || '',
//                 loc.type || ''
//             ].join(','));
//         });

//         const csv = csvRows.join('\n');

//         // Get employee name for filename
//         const [empResult] = await db.promise().query(
//             `SELECT name FROM employees WHERE id = ?`,
//             [employeeId]
//         );

//         const employeeName = empResult[0]?.name || 'employee';
//         const filename = `${employeeName}_location_history_${startDate || 'all'}_to_${endDate || 'all'}.csv`;

//         res.setHeader('Content-Type', 'text/csv');
//         res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

//         return res.status(200).send(csv);

//     } catch (error) {
//         console.error("❌ ExportLocationHistory error:", error);
//         return res.status(500).json({
//             status: false,
//             message: "Failed to export location history",
//             error: error.message
//         });
//     }
// });

// module.exports = router;






















const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate distance between two points in km using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Format duration from seconds to human readable format
 */
const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
};

/**
 * Calculate total distance of a path
 */
const calculatePathDistance = (points) => {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += calculateDistance(
            parseFloat(points[i - 1].latitude),
            parseFloat(points[i - 1].longitude),
            parseFloat(points[i].latitude),
            parseFloat(points[i].longitude)
        );
    }
    return Math.round(total * 1000) / 1000; // km, round to 3 decimals
};

/**
 * Calculate average speed of a path
 */
const calculateAverageSpeed = (points) => {
    if (points.length < 2) return 0;

    const totalDistance = calculatePathDistance(points);
    const startTime = new Date(points[0].recorded_at || points[0].timestamp);
    const endTime = new Date(points[points.length - 1].recorded_at || points[points.length - 1].timestamp);
    const hours = (endTime - startTime) / (1000 * 60 * 60);

    return hours > 0 ? Math.round((totalDistance / hours) * 100) / 100 : 0;
};

// ==================== STOP DETECTION (100m radius, 10 min minimum) ====================

/**
 * Detect stops where employee stays within 100m radius for at least 10 minutes
 * @param {Array} points - Array of location points sorted by time
 * @param {number} radiusMeters - Radius in meters (default: 100)
 * @param {number} minDurationMinutes - Minimum duration in minutes (default: 10)
 * @returns {Array} Array of stop objects with details
 */
const detectStops = (points, radiusMeters = 100, minDurationMinutes = 10) => {
    if (!points || points.length < 2) return [];

    const stops = [];
    let currentStopPoints = [];
    let stopStartIndex = 0;

    // Convert min duration to milliseconds
    const minDurationMs = minDurationMinutes * 60 * 1000;
    const radiusKm = radiusMeters / 1000;

    for (let i = 0; i < points.length; i++) {
        const currentPoint = points[i];

        if (currentStopPoints.length === 0) {
            // Start a new potential stop
            currentStopPoints = [currentPoint];
            stopStartIndex = i;
            continue;
        }

        // Check if current point is within radius of the first point in the stop
        const firstPointInStop = currentStopPoints[0];
        const distance = calculateDistance(
            parseFloat(firstPointInStop.latitude),
            parseFloat(firstPointInStop.longitude),
            parseFloat(currentPoint.latitude),
            parseFloat(currentPoint.longitude)
        );

        if (distance <= radiusKm) {
            // Still within the stop radius
            currentStopPoints.push(currentPoint);
        } else {
            // Moved outside radius - check if the stop duration meets minimum
            if (currentStopPoints.length >= 2) {
                const stopStartTime = new Date(currentStopPoints[0].recorded_at || currentStopPoints[0].timestamp);
                const stopEndTime = new Date(currentStopPoints[currentStopPoints.length - 1].recorded_at || currentStopPoints[currentStopPoints.length - 1].timestamp);
                const stopDuration = stopEndTime - stopStartTime;

                if (stopDuration >= minDurationMs) {
                    // Valid stop found
                    const stopDetails = calculateStopDetails(currentStopPoints, stopStartIndex, i - 1);
                    if (stopDetails) {
                        stops.push(stopDetails);
                    }
                }
            }

            // Start new potential stop from current point
            currentStopPoints = [currentPoint];
            stopStartIndex = i;
        }
    }

    // Check the last stop
    if (currentStopPoints.length >= 2) {
        const stopStartTime = new Date(currentStopPoints[0].recorded_at || currentStopPoints[0].timestamp);
        const stopEndTime = new Date(currentStopPoints[currentStopPoints.length - 1].recorded_at || currentStopPoints[currentStopPoints.length - 1].timestamp);
        const stopDuration = stopEndTime - stopStartTime;

        if (stopDuration >= minDurationMs) {
            const stopDetails = calculateStopDetails(currentStopPoints, stopStartIndex, points.length - 1);
            if (stopDetails) {
                stops.push(stopDetails);
            }
        }
    }

    return stops;
};

/**
 * Calculate detailed stop information
 */
const calculateStopDetails = (stopPoints, startIndex, endIndex) => {
    if (!stopPoints || stopPoints.length === 0) return null;

    // Calculate center point (average of coordinates)
    const centerLat = stopPoints.reduce((sum, p) => sum + parseFloat(p.latitude), 0) / stopPoints.length;
    const centerLng = stopPoints.reduce((sum, p) => sum + parseFloat(p.longitude), 0) / stopPoints.length;

    const firstPoint = stopPoints[0];
    const lastPoint = stopPoints[stopPoints.length - 1];

    const startTime = new Date(firstPoint.recorded_at || firstPoint.timestamp);
    const endTime = new Date(lastPoint.recorded_at || lastPoint.timestamp);
    const durationMs = endTime - startTime;

    // Calculate radius of the stop (max distance from center)
    const distancesFromCenter = stopPoints.map(p =>
        calculateDistance(
            centerLat,
            centerLng,
            parseFloat(p.latitude),
            parseFloat(p.longitude)
        ) * 1000 // Convert to meters
    );
    const maxRadius = Math.max(...distancesFromCenter);

    // Calculate movement within stop (total distance traveled while stopped)
    let movementDistance = 0;
    for (let i = 1; i < stopPoints.length; i++) {
        movementDistance += calculateDistance(
            parseFloat(stopPoints[i - 1].latitude),
            parseFloat(stopPoints[i - 1].longitude),
            parseFloat(stopPoints[i].latitude),
            parseFloat(stopPoints[i].longitude)
        );
    }

    return {
        // Location
        center: [centerLat, centerLng],
        latitude: centerLat,
        longitude: centerLng,

        // Time range
        startTime: firstPoint.recorded_at || firstPoint.timestamp,
        endTime: lastPoint.recorded_at || lastPoint.timestamp,
        startIndex,
        endIndex,

        // Duration
        durationMs,
        durationMinutes: Math.round((durationMs / (60 * 1000)) * 10) / 10,
        durationFormatted: formatDuration(durationMs / 1000),

        // Statistics
        pointCount: stopPoints.length,
        maxRadius: Math.round(maxRadius * 100) / 100, // Round to 2 decimals
        movementDistance: Math.round(movementDistance * 1000) / 1000, // km, round to 3 decimals
        movementDistanceMeters: Math.round(movementDistance * 1000), // meters

        // Raw data (optional - can be removed for performance)
        points: stopPoints.slice(0, 10) // Only first 10 points to reduce payload
    };
};

// ==================== MOVEMENT SEGMENT DETECTION ====================

/**
 * Calculate movement segments between stops
 */
const calculateMovementSegments = (points, stops) => {
    const movements = [];

    if (!points || points.length === 0) return movements;

    if (stops.length === 0) {
        // No stops, entire journey is one movement
        const totalDistance = calculatePathDistance(points);
        const avgSpeed = calculateAverageSpeed(points);
        const maxSpeed = Math.max(...points.map(p => p.speed || 0));

        return [{
            startTime: points[0].recorded_at || points[0].timestamp,
            endTime: points[points.length - 1].recorded_at || points[points.length - 1].timestamp,
            startIndex: 0,
            endIndex: points.length - 1,
            pointCount: points.length,
            distance: totalDistance,
            avgSpeed,
            maxSpeed,
            duration: (new Date(points[points.length - 1].recorded_at || points[points.length - 1].timestamp) -
                new Date(points[0].recorded_at || points[0].timestamp)) / 1000,
            durationFormatted: formatDuration(
                (new Date(points[points.length - 1].recorded_at || points[points.length - 1].timestamp) -
                    new Date(points[0].recorded_at || points[0].timestamp)) / 1000
            )
        }];
    }

    // Movement before first stop
    if (stops[0].startIndex > 0) {
        const segment = points.slice(0, stops[0].startIndex);
        if (segment.length > 0) {
            movements.push(createMovementSegment(segment, 0, stops[0].startIndex - 1));
        }
    }

    // Movements between stops
    for (let i = 0; i < stops.length - 1; i++) {
        const startIdx = stops[i].endIndex + 1;
        const endIdx = stops[i + 1].startIndex - 1;

        if (startIdx <= endIdx) {
            const segment = points.slice(startIdx, endIdx + 1);
            movements.push(createMovementSegment(segment, startIdx, endIdx));
        }
    }

    // Movement after last stop
    if (stops[stops.length - 1].endIndex < points.length - 1) {
        const segment = points.slice(stops[stops.length - 1].endIndex + 1);
        if (segment.length > 0) {
            movements.push(createMovementSegment(
                segment,
                stops[stops.length - 1].endIndex + 1,
                points.length - 1
            ));
        }
    }

    return movements;
};

/**
 * Create a movement segment object
 */
const createMovementSegment = (points, startIndex, endIndex) => {
    const totalDistance = calculatePathDistance(points);
    const avgSpeed = calculateAverageSpeed(points);
    const maxSpeed = Math.max(...points.map(p => p.speed || 0));
    const duration = (new Date(points[points.length - 1].recorded_at || points[points.length - 1].timestamp) -
        new Date(points[0].recorded_at || points[0].timestamp)) / 1000;

    return {
        startTime: points[0].recorded_at || points[0].timestamp,
        endTime: points[points.length - 1].recorded_at || points[points.length - 1].timestamp,
        startIndex,
        endIndex,
        pointCount: points.length,
        distance: Math.round(totalDistance * 1000) / 1000,
        avgSpeed: Math.round(avgSpeed * 100) / 100,
        maxSpeed: Math.round(maxSpeed * 100) / 100,
        duration,
        durationFormatted: formatDuration(duration)
    };
};

// ==================== DAILY SUMMARIES ====================

/**
 * Generate daily summaries with stop information
 */
const generateDailySummaries = (history, allStops) => {
    const dailyMap = new Map();

    history.forEach(point => {
        const date = new Date(point.recorded_at || point.timestamp).toISOString().split('T')[0];

        if (!dailyMap.has(date)) {
            dailyMap.set(date, {
                date,
                points: [],
                totalDistance: 0,
                firstLocationTime: point.recorded_at || point.timestamp,
                lastLocationTime: point.recorded_at || point.timestamp,
                maxSpeed: 0,
                speedSum: 0,
                speeds: []
            });
        }

        const day = dailyMap.get(date);
        day.points.push(point);

        // Update times
        const pointTime = new Date(point.recorded_at || point.timestamp);
        if (pointTime < new Date(day.firstLocationTime)) {
            day.firstLocationTime = point.recorded_at || point.timestamp;
        }
        if (pointTime > new Date(day.lastLocationTime)) {
            day.lastLocationTime = point.recorded_at || point.timestamp;
        }

        // Update speed
        day.maxSpeed = Math.max(day.maxSpeed, point.speed || 0);
        day.speedSum += point.speed || 0;
        if (point.speed > 0) {
            day.speeds.push(point.speed);
        }
    });

    // Process each day
    const dailySummaries = [];

    dailyMap.forEach(day => {
        // Filter stops for this day
        const dayStops = allStops.filter(stop => {
            const stopDate = new Date(stop.startTime).toISOString().split('T')[0];
            return stopDate === day.date;
        });

        // Calculate total distance for the day
        for (let i = 1; i < day.points.length; i++) {
            const dist = calculateDistance(
                parseFloat(day.points[i - 1].latitude),
                parseFloat(day.points[i - 1].longitude),
                parseFloat(day.points[i].latitude),
                parseFloat(day.points[i].longitude)
            );
            day.totalDistance += dist;
        }

        // Calculate stop statistics
        const stopDuration = dayStops.reduce((sum, stop) => sum + stop.durationMs, 0);
        const stopCount = dayStops.length;

        // Calculate active time (total time minus stop durations)
        const totalDuration = new Date(day.lastLocationTime) - new Date(day.firstLocationTime);
        const activeTime = Math.max(0, totalDuration - stopDuration);

        // Calculate average speed (only when moving)
        const avgMovingSpeed = day.speeds.length > 0
            ? day.speeds.reduce((a, b) => a + b, 0) / day.speeds.length
            : 0;

        dailySummaries.push({
            date: day.date,
            totalDistance: Math.round(day.totalDistance * 1000) / 1000,
            totalDistanceFormatted: `${Math.round(day.totalDistance * 1000) / 1000} km`,
            activeTime,
            activeTimeFormatted: formatDuration(activeTime / 1000),
            stopDuration,
            stopDurationFormatted: formatDuration(stopDuration / 1000),
            stopsCount: stopCount,
            pointCount: day.points.length,
            avgSpeed: Math.round((day.speedSum / day.points.length) * 100) / 100,
            avgMovingSpeed: Math.round(avgMovingSpeed * 100) / 100,
            maxSpeed: Math.round(day.maxSpeed * 100) / 100,
            firstLocationTime: day.firstLocationTime,
            lastLocationTime: day.lastLocationTime,
            stops: dayStops.map(stop => ({
                startTime: stop.startTime,
                endTime: stop.endTime,
                duration: stop.durationFormatted,
                durationMinutes: stop.durationMinutes,
                location: stop.center,
                radius: stop.maxRadius
            }))
        });
    });

    return dailySummaries.sort((a, b) => b.date.localeCompare(a.date));
};

// ==================== HEATMAP DATA GENERATION ====================

/**
 * Generate heatmap grid data
 */
const generateHeatmapData = (points, gridSize = 0.001) => {
    const grid = {};

    points.forEach(point => {
        const lat = parseFloat(point.latitude);
        const lng = parseFloat(point.longitude);
        const latKey = Math.floor(lat / gridSize) * gridSize;
        const lngKey = Math.floor(lng / gridSize) * gridSize;
        const key = `${latKey.toFixed(6)}-${lngKey.toFixed(6)}`;

        if (!grid[key]) {
            grid[key] = {
                center: [latKey + gridSize / 2, lngKey + gridSize / 2],
                count: 0,
                points: [],
                speeds: [],
                firstSeen: point.recorded_at || point.timestamp,
                lastSeen: point.recorded_at || point.timestamp
            };
        }

        grid[key].count++;
        grid[key].points.push(point);
        grid[key].speeds.push(point.speed || 0);

        if (new Date(point.recorded_at || point.timestamp) < new Date(grid[key].firstSeen)) {
            grid[key].firstSeen = point.recorded_at || point.timestamp;
        }
        if (new Date(point.recorded_at || point.timestamp) > new Date(grid[key].lastSeen)) {
            grid[key].lastSeen = point.recorded_at || point.timestamp;
        }
    });

    // Calculate intensity and average speed
    const maxCount = Math.max(...Object.values(grid).map(g => g.count));

    return Object.entries(grid).map(([key, data]) => ({
        key,
        center: data.center,
        count: data.count,
        intensity: data.count / maxCount,
        avgSpeed: data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length,
        firstSeen: data.firstSeen,
        lastSeen: data.lastSeen
    }));
};

// ==================== API ENDPOINTS ====================

/**
 * GET /LocationHistory/GetLocationHistory
 * Get location history for an employee with stop detection
 */
router.post("/GetLocationHistory", async (req, res) => {
    try {
        const {
            employeeId,
            companyId,
            startDate,
            endDate,
            page = 1,
            limit = 100,
            sortOrder = 'DESC'
        } = req.body;

        // Validation
        if (!employeeId || !companyId) {
            return res.status(400).json({
                status: false,
                message: "Employee ID and Company ID are required"
            });
        }

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Build query
        let query = `
            SELECT 
                id,
                employee_id,
                company_id,
                latitude,
                longitude,
                speed,
                heading,
                altitude,
                accuracy,
                battery_level,
                event_type,
                recorded_at,
                created_at,
                type
            FROM employee_locations 
            WHERE employee_id = ? 
            AND company_id = ?
        `;

        const params = [employeeId, companyId];

        // Add date filters if provided
        if (startDate && endDate) {
            query += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        } else if (startDate) {
            query += ` AND DATE(recorded_at) >= ?`;
            params.push(startDate);
        } else if (endDate) {
            query += ` AND DATE(recorded_at) <= ?`;
            params.push(endDate);
        }

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM employee_locations 
            WHERE employee_id = ? AND company_id = ?
        `;
        const countParams = [employeeId, companyId];

        if (startDate && endDate) {
            countQuery += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
            countParams.push(startDate, endDate);
        }

        const [totalResult] = await db.promise().query(countQuery, countParams);
        const total = totalResult[0].total;

        // Add sorting and pagination to main query
        query += ` ORDER BY recorded_at ${sortOrder === 'DESC' ? 'DESC' : 'ASC'} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        // Execute query
        const [history] = await db.promise().query(query, params);

        // If no data, return empty response
        if (history.length === 0) {
            return res.status(200).json({
                status: true,
                data: {
                    history: [],
                    dailySummaries: [],
                    periodTotals: null,
                    stops: [],
                    movements: [],
                    heatmap: [],
                    pagination: {
                        currentPage: page,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: limit,
                        hasNext: false,
                        hasPrevious: page > 1
                    }
                }
            });
        }

        // Process history data
        const processedHistory = history.map(point => ({
            id: point.id,
            employee_id: point.employee_id,
            company_id: point.company_id,
            latitude: parseFloat(point.latitude),
            longitude: parseFloat(point.longitude),
            speed: parseFloat(point.speed || 0),
            heading: point.heading ? parseFloat(point.heading) : null,
            altitude: point.altitude ? parseFloat(point.altitude) : null,
            accuracy: point.accuracy ? parseFloat(point.accuracy) : null,
            battery_level: point.battery_level,
            event_type: point.event_type,
            recorded_at: point.recorded_at,
            created_at: point.created_at,
            type: point.type,
            timestamp: point.recorded_at || point.created_at
        }));

        // Sort by time ascending for proper stop detection
        const timeSortedHistory = [...processedHistory].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Detect stops with 100m radius for at least 10 minutes
        const stops = detectStops(timeSortedHistory, 100, 10);

        // Calculate movement segments
        const movements = calculateMovementSegments(timeSortedHistory, stops);

        // Generate daily summaries
        const dailySummaries = generateDailySummaries(timeSortedHistory, stops);

        // Generate heatmap data
        const heatmapData = generateHeatmapData(timeSortedHistory, 0.001);

        // Calculate period totals
        const totalDistance = movements.reduce((sum, seg) => sum + seg.distance, 0);
        const totalActiveTime = movements.reduce((sum, seg) => sum + (seg.duration * 1000), 0);
        const totalStopTime = stops.reduce((sum, stop) => sum + stop.durationMs, 0);
        const totalStops = stops.length;
        const activeDays = dailySummaries.length;

        const periodTotals = {
            totalDistance: Math.round(totalDistance * 1000) / 1000,
            totalDistanceFormatted: `${Math.round(totalDistance * 1000) / 1000} km`,
            totalActiveTime,
            totalActiveTimeFormatted: formatDuration(totalActiveTime / 1000),
            totalStopTime,
            totalStopTimeFormatted: formatDuration(totalStopTime / 1000),
            totalStops,
            avgDailyDistance: activeDays > 0 ? Math.round((totalDistance / activeDays) * 1000) / 1000 : 0,
            activeDays,
            averageStopDuration: stops.length > 0
                ? formatDuration((stops.reduce((sum, s) => sum + s.durationMs, 0) / stops.length) / 1000)
                : '0s',
            longestStop: stops.length > 0
                ? formatDuration(Math.max(...stops.map(s => s.durationMs)) / 1000)
                : '0s',
            totalMovements: movements.length,
            averageMovementDistance: movements.length > 0
                ? Math.round((movements.reduce((sum, m) => sum + m.distance, 0) / movements.length) * 1000) / 1000
                : 0
        };

        return res.status(200).json({
            status: true,
            data: {
                history: sortOrder === 'DESC' ? processedHistory : timeSortedHistory,
                dailySummaries,
                periodTotals,
                stops,
                movements,
                heatmap: heatmapData,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNext: offset + limit < total,
                    hasPrevious: page > 1
                }
            }
        });

    } catch (error) {
        console.error("❌ GetLocationHistory error:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch location history",
            error: error.message
        });
    }
});

/**
 * POST /LocationHistory/GetLiveLocations
 * Get last known location for all employees in a company
 */
router.post("/GetLiveLocations", async (req, res) => {
    try {
        const { companyId, employeeIds } = req.body;

        if (!companyId) {
            return res.status(400).json({
                status: false,
                message: "Company ID is required"
            });
        }

        let query = `
            SELECT el.* 
            FROM employee_locations el
            INNER JOIN (
                SELECT employee_id, MAX(recorded_at) as max_recorded
                FROM employee_locations
                WHERE company_id = ?
                ${employeeIds && employeeIds.length ? `AND employee_id IN (${employeeIds.map(() => '?').join(',')})` : ''}
                GROUP BY employee_id
            ) latest ON el.employee_id = latest.employee_id 
                AND el.recorded_at = latest.max_recorded
            WHERE el.company_id = ?
            ${employeeIds && employeeIds.length ? `AND el.employee_id IN (${employeeIds.map(() => '?').join(',')})` : ''}
            ORDER BY el.recorded_at DESC
        `;

        const params = [companyId];
        if (employeeIds && employeeIds.length) {
            params.push(...employeeIds);
        }
        params.push(companyId);
        if (employeeIds && employeeIds.length) {
            params.push(...employeeIds);
        }

        const [locations] = await db.promise().query(query, params);

        const processedLocations = locations.map(loc => ({
            ...loc,
            latitude: parseFloat(loc.latitude),
            longitude: parseFloat(loc.longitude),
            speed: parseFloat(loc.speed || 0),
            timestamp: loc.recorded_at,
            minutesAgo: Math.floor((new Date() - new Date(loc.recorded_at)) / (1000 * 60))
        }));

        return res.status(200).json({
            status: true,
            data: processedLocations
        });

    } catch (error) {
        console.error("❌ GetLiveLocations error:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch live locations",
            error: error.message
        });
    }
});

/**
 * POST /LocationHistory/GetLocationStats
 * Get detailed statistics for an employee
 */
router.post("/GetLocationStats", async (req, res) => {
    try {
        const { employeeId, companyId, startDate, endDate } = req.body;

        if (!employeeId || !companyId) {
            return res.status(400).json({
                status: false,
                message: "Employee ID and Company ID are required"
            });
        }

        // Get all points for the period
        let query = `
            SELECT 
                latitude,
                longitude,
                speed,
                recorded_at
            FROM employee_locations 
            WHERE employee_id = ? 
            AND company_id = ?
        `;

        const params = [employeeId, companyId];

        if (startDate && endDate) {
            query += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += ` ORDER BY recorded_at ASC`;

        const [points] = await db.promise().query(query, params);

        if (points.length === 0) {
            return res.status(200).json({
                status: true,
                data: {
                    message: "No data found for the selected period",
                    stats: null
                }
            });
        }

        // Process points
        const processedPoints = points.map(p => ({
            latitude: parseFloat(p.latitude),
            longitude: parseFloat(p.longitude),
            speed: parseFloat(p.speed || 0),
            timestamp: p.recorded_at
        }));

        // Detect stops
        const stops = detectStops(processedPoints, 100, 10);

        // Calculate movement segments
        const movements = calculateMovementSegments(processedPoints, stops);

        // Calculate hourly distribution
        const hourlyDistribution = Array(24).fill(0).map(() => ({ count: 0, speed: 0 }));
        processedPoints.forEach(point => {
            const hour = new Date(point.timestamp).getHours();
            hourlyDistribution[hour].count++;
            hourlyDistribution[hour].speed += point.speed;
        });

        // Calculate speed distribution
        const speedDistribution = {
            stopped: { count: 0, label: 'Stopped (0 km/h)' },
            verySlow: { count: 0, label: 'Very Slow (0-5 km/h)' },
            slow: { count: 0, label: 'Slow (5-20 km/h)' },
            moderate: { count: 0, label: 'Moderate (20-40 km/h)' },
            fast: { count: 0, label: 'Fast (40-60 km/h)' },
            veryFast: { count: 0, label: 'Very Fast (>60 km/h)' }
        };

        processedPoints.forEach(point => {
            const speed = point.speed;
            if (speed === 0) speedDistribution.stopped.count++;
            else if (speed < 5) speedDistribution.verySlow.count++;
            else if (speed < 20) speedDistribution.slow.count++;
            else if (speed < 40) speedDistribution.moderate.count++;
            else if (speed < 60) speedDistribution.fast.count++;
            else speedDistribution.veryFast.count++;
        });

        // Find top locations
        const locationGroups = {};
        processedPoints.forEach(point => {
            const key = `${point.latitude.toFixed(4)}-${point.longitude.toFixed(4)}`;
            if (!locationGroups[key]) {
                locationGroups[key] = {
                    latitude: point.latitude,
                    longitude: point.longitude,
                    count: 0,
                    firstSeen: point.timestamp,
                    lastSeen: point.timestamp
                };
            }
            locationGroups[key].count++;
            if (new Date(point.timestamp) < new Date(locationGroups[key].firstSeen)) {
                locationGroups[key].firstSeen = point.timestamp;
            }
            if (new Date(point.timestamp) > new Date(locationGroups[key].lastSeen)) {
                locationGroups[key].lastSeen = point.timestamp;
            }
        });

        const topLocations = Object.values(locationGroups)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(loc => ({
                ...loc,
                latitude: parseFloat(loc.latitude),
                longitude: parseFloat(loc.longitude)
            }));

        return res.status(200).json({
            status: true,
            data: {
                totalPoints: processedPoints.length,
                stops: stops.length,
                movements: movements.length,
                totalDistance: movements.reduce((sum, m) => sum + m.distance, 0),
                totalActiveTime: movements.reduce((sum, m) => sum + m.duration, 0),
                totalStopTime: stops.reduce((sum, s) => sum + s.durationMinutes * 60, 0),
                hourlyDistribution,
                speedDistribution,
                topLocations,
                stops: stops.slice(0, 20), // Limit to 20 most recent stops
                movements: movements.slice(0, 20) // Limit to 20 most recent movements
            }
        });

    } catch (error) {
        console.error("❌ GetLocationStats error:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch location statistics",
            error: error.message
        });
    }
});

/**
 * POST /LocationHistory/GetHeatmapData
 * Get heatmap data for visualization
 */
router.post("/GetHeatmapData", async (req, res) => {
    try {
        const { employeeId, companyId, startDate, endDate, gridSize = 0.001 } = req.body;

        if (!employeeId || !companyId) {
            return res.status(400).json({
                status: false,
                message: "Employee ID and Company ID are required"
            });
        }

        let query = `
            SELECT 
                latitude,
                longitude,
                speed,
                recorded_at
            FROM employee_locations 
            WHERE employee_id = ? 
            AND company_id = ?
        `;

        const params = [employeeId, companyId];

        if (startDate && endDate) {
            query += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        const [points] = await db.promise().query(query, params);

        if (points.length === 0) {
            return res.status(200).json({
                status: true,
                data: []
            });
        }

        const processedPoints = points.map(p => ({
            latitude: parseFloat(p.latitude),
            longitude: parseFloat(p.longitude),
            speed: parseFloat(p.speed || 0),
            timestamp: p.recorded_at
        }));

        const heatmapData = generateHeatmapData(processedPoints, gridSize);

        return res.status(200).json({
            status: true,
            data: heatmapData
        });

    } catch (error) {
        console.error("❌ GetHeatmapData error:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch heatmap data",
            error: error.message
        });
    }
});

/**
 * POST /LocationHistory/ExportLocationHistory
 * Export location history to CSV
 */
router.post("/ExportLocationHistory", async (req, res) => {
    try {
        const { employeeId, companyId, startDate, endDate } = req.body;

        if (!employeeId || !companyId) {
            return res.status(400).json({
                status: false,
                message: "Employee ID and Company ID are required"
            });
        }

        let query = `
            SELECT 
                employee_id,
                DATE(recorded_at) as date,
                TIME(recorded_at) as time,
                latitude,
                longitude,
                speed,
                heading,
                altitude,
                accuracy,
                battery_level,
                event_type,
                type,
                recorded_at
            FROM employee_locations 
            WHERE employee_id = ? 
            AND company_id = ?
        `;

        const params = [employeeId, companyId];

        if (startDate && endDate) {
            query += ` AND DATE(recorded_at) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += ` ORDER BY recorded_at ASC`;

        const [locations] = await db.promise().query(query, params);

        if (locations.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No location data found for export"
            });
        }

        // Generate CSV
        const csvRows = [];

        // Headers
        csvRows.push([
            'Date',
            'Time',
            'Latitude',
            'Longitude',
            'Speed (km/h)',
            'Heading',
            'Altitude',
            'Accuracy (m)',
            'Battery Level (%)',
            'Event Type',
            'Type',
            'Full Timestamp'
        ].join(','));

        // Data rows
        locations.forEach(loc => {
            csvRows.push([
                loc.date,
                loc.time,
                parseFloat(loc.latitude).toFixed(6),
                parseFloat(loc.longitude).toFixed(6),
                parseFloat(loc.speed || 0).toFixed(2),
                loc.heading ? parseFloat(loc.heading).toFixed(2) : '',
                loc.altitude ? parseFloat(loc.altitude).toFixed(2) : '',
                loc.accuracy ? parseFloat(loc.accuracy).toFixed(2) : '',
                loc.battery_level || '',
                loc.event_type || '',
                loc.type || '',
                loc.recorded_at
            ].join(','));
        });

        const csv = csvRows.join('\n');

        // Get employee name for filename
        const [empResult] = await db.promise().query(
            `SELECT name FROM employees WHERE id = ?`,
            [employeeId]
        );

        const employeeName = empResult[0]?.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'employee';
        const dateStr = startDate && endDate
            ? `${startDate}_to_${endDate}`
            : 'all_time';
        const filename = `${employeeName}_location_history_${dateStr}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', csv.length);

        return res.status(200).send(csv);

    } catch (error) {
        console.error("❌ ExportLocationHistory error:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to export location history",
            error: error.message
        });
    }
});

/**
 * GET /LocationHistory/GetEmployeeSummary/:employeeId
 * Get quick summary for an employee
 */
router.get("/GetEmployeeSummary/:employeeId", async (req, res) => {
    try {
        const { employeeId } = req.params;
        const userData = req.user;

        if (!employeeId) {
            return res.status(400).json({
                status: false,
                message: "Employee ID is required"
            });
        }

        // Get today's data
        const today = new Date().toISOString().split('T')[0];

        const [todayLocations] = await db.promise().query(
            `SELECT 
                COUNT(*) as total_points,
                MIN(recorded_at) as first_time,
                MAX(recorded_at) as last_time,
                AVG(speed) as avg_speed,
                MAX(speed) as max_speed
            FROM employee_locations 
            WHERE employee_id = ? 
            AND company_id = ?
            AND DATE(recorded_at) = ?`,
            [employeeId, userData.company_id, today]
        );

        // Get last location
        const [lastLocation] = await db.promise().query(
            `SELECT 
                latitude,
                longitude,
                speed,
                recorded_at
            FROM employee_locations 
            WHERE employee_id = ? 
            AND company_id = ?
            ORDER BY recorded_at DESC 
            LIMIT 1`,
            [employeeId, userData.company_id]
        );

        // Get weekly stats
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];

        const [weeklyStats] = await db.promise().query(
            `SELECT 
                COUNT(DISTINCT DATE(recorded_at)) as active_days,
                COUNT(*) as total_points,
                AVG(speed) as avg_speed
            FROM employee_locations 
            WHERE employee_id = ? 
            AND company_id = ?
            AND DATE(recorded_at) >= ?`,
            [employeeId, userData.company_id, weekAgoStr]
        );

        const summary = {
            today: {
                points: todayLocations[0]?.total_points || 0,
                firstTime: todayLocations[0]?.first_time || null,
                lastTime: todayLocations[0]?.last_time || null,
                avgSpeed: Math.round((todayLocations[0]?.avg_speed || 0) * 100) / 100,
                maxSpeed: Math.round((todayLocations[0]?.max_speed || 0) * 100) / 100,
                isActive: lastLocation.length > 0 &&
                    (new Date() - new Date(lastLocation[0].recorded_at)) < 5 * 60 * 1000 // Active in last 5 minutes
            },

            lastLocation: lastLocation.length > 0 ? {
                latitude: parseFloat(lastLocation[0].latitude),
                longitude: parseFloat(lastLocation[0].longitude),
                speed: parseFloat(lastLocation[0].speed || 0),
                timestamp: lastLocation[0].recorded_at,
                minutesAgo: Math.floor((new Date() - new Date(lastLocation[0].recorded_at)) / (1000 * 60))
            } : null,

            weekly: {
                activeDays: weeklyStats[0]?.active_days || 0,
                totalPoints: weeklyStats[0]?.total_points || 0,
                avgSpeed: Math.round((weeklyStats[0]?.avg_speed || 0) * 100) / 100
            }
            
        };

        return res.status(200).json({
            status: true,
            data: summary
        });

    } catch (error) {
        console.error("❌ GetEmployeeSummary error:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch employee summary",
            error: error.message
        });
    }
});

module.exports = router;